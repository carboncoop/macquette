# My Home Energy Planner (MHEP) Django

[![Build Status](https://travis-ci.org/mhep-transition/mhep-django.svg?branch=master)](https://travis-ci.org/mhep-transition/mhep-django)
[![Coverage Status](https://coveralls.io/repos/github/mhep-transition/mhep-django/badge.svg?branch=master)](https://coveralls.io/github/mhep-transition/mhep-django?branch=master)

Online developer docs: https://carboncoop.gitlab.io/mhep/index.html

## Checkout the repo and submodules

```
git clone --recursive https://github.com/mhep-transition/mhep-django
```

Or, if you've already cloned `mhep-django`, run:

```
git submodule update --init --recursive
```

## Install Vagrant & Virtualbox

* Install [Vagrant 2.0.1+](https://www.vagrantup.com/downloads.html)

* Install [Virtualbox 5.2.18](https://www.virtualbox.org/wiki/Downloads)

## Run `vagrant up`

It should create a new Ubuntu 18.04 VM and configure everything.

## Start Django

With the vagrant box running, run:

`vagrant ssh`

Once connected to the box, simply run:

`make run`

This will start the Django server.

## Access MHEP

Browse to [localhost:9090](http://localhost:9090)

An administrative interface is available at [localhost:9090/admin](http://localhost:9090/admin), the username is `localadmin`, password `localadmin`


## Design decisions

Here we document some decisions and principles we worked to while carrying out the port from
emoncms.

### Prefer static files over Django templates

Previously, most app logic was implemented in Javascript, but there were a number of places where
things were rendered by PHP. We almost completely eliminated this so that all data used by the
app comes via API endpoints.

The principle was to decide one way or another whether it's a backend (rendered HTML) app or
a frontend+API app.

There were 2 notable places we *had* to use Django template functions:

1. The `{% static %}` template tag. This is used by both HTML files (for imports) and by Javascript
   (for dynamic loading of scripts). For the 2nd case, we created `urlHelper.static(..)` - a JS
   function which hides the use of `{% static %}` in a single place.

2. The `{% url %}` (AKA `reverse`) template tag, for deriving the URL of an API endpoint. Again,
   we created `urlHelper.api.*()` functions to wrap and hide the use of Django's template language.

### Define relationships in the API (hide from frontend)

The *data model* of the app - the relationships between assessments, users,
organisations and libraries - is defined in Django's models, views and
permission classes.

The principle was to define this *only* in the API and try not to duplicate that knowledge in the
frontend.

For example: only an *organisation admin* can add or remove *librarians* to an organisation.

That's defined in the API. But how to render different UI to the user depending if they're an
admin or not?

 One approach would be for the Javascript to check if we're an organisation admin,
and selectively show the buttons to add and remove librarians.

But that would be duplicating the logic. Instead we chose to implement
`permissions` on the organisation list endpoint:

```json
"permissions": {
    "can_add_remove_members": true,
    "can_promote_demote_librarians": true,
}
```

This describes what the *current user* is allowed to do in that organisation - so the frontend
code doesn't need to understand the current user's roles directly.

### Frontend: prefer cloning DOM templates

In the absence of a modern framework like React, the app manually manipulates the DOM. This means
that code and presentation are mixed up and it can be hard to understand what's going on.

For the bits of frontend we worked on (e.g. libraries manager, organisation manager) we preferred
the principle of cloning templates.

Rather than outputting table rows like this:

```javascript
var myhtml = '<tr>';
myhtml += 'something ';
myhtml += '<button>' x.name + '</button';
myhtml += '</tr>';
```

... we'd define a hidden template row in the HTML file:

```html
<tr id="my-row-template" style: "display: none">
  something <button class="foo-button"></button>
</tr>
```

... then clone and manipulate it from Javascript:

```javascript
var newRow = $('#my-row-template').clone();
newRow.removeAttr('id');

newRow.find('.foo-button').html(x.name);
newRow.show()
```

This way means you can look at the HTML and more easily understand how the DOM is supposed to
look.


## Working with app versions

The app is fully versioned at the Django application level, with names like `v1`, `v2` etc.

Different app versions live under a URL prefix e.g. `/v1/`.

App versions are highly isolated, meaning each version has its own:

* templates & static assets
* URL schema (including API URLs)
* database models


### Starting a new app version

To start working on a new version of the app, cd into `./mhep` and run the script
[`upversion.sh`](https://github.com/mhep-transition/mhep-django/blob/master/mhep/upversion.sh)
and set the new version as `dev`.

The script copies an app version to a new version, for example, going from `v1` to `dev`:

* copy-pastes the whole directory `mhep/mhep/v1` to `/mhep/mhep/dev`
* renames the `static/v1` and `templates/v1` subdirectories
* adds the new `dev` app to Django's `LOCAL_APPS` setting and `urls.py`
* modifies the `dev/fixtures/*.json` files with the updated app label


### Finalising an app version

When the `dev` app is finished it should be renamed to e.g. `v2`.

Once an app is assigned a version number its code should never be modified again.


# v1 API endpoints

* [List assessments](#list-assessments)
* [List assessments for organisation](#list-assessments-for-organisation)
* [Get assessment](#get-assessment)
* [Create assessment](#create-assessment)
* [Create assessment for organisation](#create-assessment-for-organisation)
* [Update a field on assessment](#update-a-field-on-assessment)
* [Delete assessment](#delete-assessment)
* [List users](#list-users)
* [List organisations](#list-organisations)
* [Add member to organisation](#add-member-to-organisation)
* [Remove member from organisation](#remove-member-from-organisation)
* [Set organisation user as librarian](#set-organisation-user-as-librarian)
* [Unset organisation user as librarian](#unset-organisation-user-as-librarian)
* [List libraries](#list-libraries)
* [Create a library](#create-a-library)
* [Create a library for organisation](#create-a-library-for-organisation)
* [Update a library](#update-a-library)
* [Share an organisation library with another organisation](#share-an-organisation-library-with-another-organisation)
* [Unshare an organisation library with another organisation](#unshare-an-organisation-library-with-another-organisation)
* [List organisations a library is shared with](#list-organisations-a-library-is-shared-with)
* [Delete a library](#delete-a-library)
* [Create item in library](#create-item-in-library)
* [Update item in library](#update-item-in-library)
* [Delete item in library](#delete-item-in-library)

All endpoints start with `/v1/api` e.g. `http://localhost:9090/v1/api/assessments/`.

## List assessments

```
GET /assessments/
```

List all assessments the current user has access to.

ℹ️ porting notes: replaces previous `assessment/list` route.

### Example

```
GET /assessments/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json
[
    {
        "id": "1",
        "name": "Example assessment",
        "description": "Example description",
        "openbem_version": "10.1.1",
        "status": "In progress",
        "created_at": "2019-08-15T15:25:37.634182Z",
        "updated_at": "2019-08-21T10:40:58.830425Z",
        "author": "localadmin",
        "userid": "1",
        "mdate": "1566384058",
    }
]
```

## List assessments for organisation

```
GET /organisations/:id/assessments/
```

List all assessments that belong to an organisation.

ℹ️ porting notes: replaces previous `assessment/list` with `orgid` param.

### Example

```
GET /organisations/1/assessments/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json
[
    {
        "id": "1",
        "name": "Example assessment",
        "description": "Example description",
        "openbem_version": "10.1.1",
        "status": "In progress",
        "created_at": "2019-08-15T15:25:37.634182Z",
        "updated_at": "2019-08-21T10:40:58.830425Z",
        "author": "localadmin",
        "userid": "1",
        "mdate": "1566384058",
    }
]
```

## Get assessment

```
GET /assessments/:id/
```

ℹ️ porting notes: replaces previous route `assessment/get`

### Example

```
> curl http://localhost:9090/v1/api/assessments/1
```

Returns:

```
HTTP 200 OK
Content-Type: application/json

{
    "id": "1",
    "name": "Example assessment",
    "description": "Example description",
    "openbem_version": "10.1.1",
    "status": "In progress",
    "created_at": "2019-08-15T15:25:37.634182Z",
    "updated_at": "2019-08-21T10:40:58.830425Z",
    "author": "localadmin",
    "userid": "1",
    "mdate": "1566384058",
    "images": [
        {
            "id": 7,
            "url": "https://gallery.img/6.jpg",
            "width": 400,
            "height": 300,
            "thumbnail_url": "https://gallery.img/6_thumb.jpg",
            "thumbnail_width": 200,
            "thumbnail_height": 150,
            "note": "",
            "is_featured": true
        }
    ],
    "data": {
        "master": {
            "scenario_name": "Master",
            "household": {
                "3a_heatinghours_weekday_on1_hours": 6,
                "3a_heatinghours_weekday_on1_mins": 45,
                ...
            },
            ...
        }
    }
}
```

## Create assessment

```
POST /assessments/
```

ℹ️ porting notes: replaces previous `assessment/create` route.

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/assessments/ \
    --data @- << EOF
{
    "name": "Example assessment",
    "description": "Example description",
    "openbem_version": "10.1.1"
}
EOF
```

Returns:

```
HTTP 201 Created
Content-Type: application/json

{
    "id": 6,
    "name": "Example assesment",
    "description": "Example description",
    "openbem_version": "10.1.1",
    "status": "In progress",
    "created_at": "2019-06-01T16:35:34Z",
    "updated_at": "2019-06-01T16:35:34Z",
    "mdate": "1559406934",
    "author": "janedoe",
    "userid": "2",
}
```

## Create assessment for organisation

```
POST /organisations/:id/assessments/
```

ℹ️ porting notes: replaces previous `assessment/create` with `org` param.

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/organisations/1/assessments/ \
    --data @- << EOF
{
    "name": "Example assessment",
    "description": "Example description",
    "openbem_version": "10.1.1"
}
EOF
```

Returns:

```
HTTP 201 Created
Content-Type: application/json

{
    "id": 6,
    "name": "Example assesment",
    "description": "Example description",
    "openbem_version": "10.1.1",
    "status": "In progress",
    "created_at": "2019-06-01T16:35:34Z",
    "updated_at": "2019-06-01T16:35:34Z",
    "mdate": "1559406934",
    "author": "janedoe",
    "userid": "2",
}
```

## Update a field on assessment

```
PATCH /assessments/:id/
Content-Type: application/json
```

ℹ️ porting notes: replaces previous routes:

* `assessment/setdata`
* `assessment/setnameanddescription`
* `assessment/setopenBEMversion`
* `assessment/setstatus`

### Example: update the model data

```
> curl -v \
    -X PATCH \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/assessments/1/ \
    --data @- << EOF

{
    "data": {
        "master": {
            "scenario_name": "Master",
            "household": {
                "3a_heatinghours_weekday_on1_hours": 6,
                "3a_heatinghours_weekday_on1_mins": 45,
        ...
    }
}
```

Returns:

```
HTTP 204 No content
```

### Example: update the status

```
> curl -v \
    -X PATCH \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/assessments/1/ \
    --data @- << EOF
{
    "status": "Complete",
}
EOF
```

## Delete assessment

```
DELETE /assessments/:id/
```

ℹ️ porting notes: replaces previous `assessment/delete` route.

### Example

```
> curl -v \
    -X DELETE \
    http://localhost:9090/v1/api/assessments/1/
```

Returns:

```
HTTP 204 No content
```

## Upload an image to the image gallery

```
POST /assessments/:id/images/
```

### Example

```
curl -v \
    -F 'file=@image.png' \
    http://localhost:9090/dev/api/assessments/1/images/
```

Returns:

```
HTTP/1.1 200 OK
Content-Type: application/json
{
    "id": 3,
    "url": "/media/images/342e8902-b709-4fff-b6da-73acc0c9488d.png",
    "width": 800,
    "height": 127,
    "thumbnail_url": "/media/images/342e8902-b709-4fff-b6da-73acc0c9488d_thumb.jpg",
    "thumbnail_width": 600,
    "thumbnail_height": 95,
    "note": "image",
    "is_featured": false
}
```

## Changing the featured image

```
POST /assessments/:id/images/featured/
```

### Example

```
> curl -v \
    -X POST \
    -H "Content-Type: application/json" \
    http://localhost:9090/dev/api/assessments/1/images/featured/ \
    --data @- << EOF
{
    "id": 6
}
EOF
```

Returns:

```
HTTP/1.1 204 No Content
```

## Edit an image's note

```
PATCH /images/:id/
```

### Example

```
> curl -v \
    -X PATCH \
    -H "Content-Type: application/json" \
    http://localhost:9090/dev/api/images/10/ \
    --data @- << EOF
{
    "note": "Corbyn's greenhouse"
}
EOF
```

Returns:

```
HTTP/1.1 200 OK
Content-Type: application/json
{
    "id": 10,
    "note": "Corbyn's greenhouse",
    ...                     # All other fields the same
}
```

## Delete an image

```
DELETE /images/:id/
```

### Example

```
curl -v \
    -X DELETE \
    http://localhost:9090/dev/api/images/6/
```

Returns:

```
HTTP/1.1 204 No Content
```

## List users

```
GET /users/
```

List all the users.

### Example

```
GET /users/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json
[
     {
        "id": "1",
        "name": "admin"
    },
    {
        "id": "2",
        "name": "janedoe"
    },
    {
        "id": "3",
        "name": "michael2"
    }
]
```

## List organisations

```
GET /organisations/
```

List all organisations the current user is a member of. Each organisation also returns `permissions`, which shows what the current user can and can not do.

ℹ️ porting notes: replaces previous `assessment/getorganisations` route.

### Example

```
GET /organisations/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json
[
    {
        "id": "1",
        "name": "Chigley Community Energy",
        "assessments": 0,
        "members": [
            {
                "userid": "2",
                "name": "janedoe",
                "last_active": "2019-06-03T16:35:00+00:00",
                "is_admin": true,
                "is_librarian": true
            }
        ],
        "permissions": {
            "can_add_remove_members": true,
            "can_promote_demote_librarians": true,
        }
    },
    {
        "id": "2",
        "name": "Sandford Assessment CIC",
        "assessments": 1,
        "members": [
            {
                "userid": "2",
                "name": "janedoe",
                "last_login": "2019-06-03T16:35:00+00:00",
                "is_admin": true,
                "is_librarian": false
            },
            {
                "userid": "3",
                "name": "michael2",
                "last_login": "2019-06-03T16:35:00+00:00"
                "is_admin": false,
                "is_librarian": true
            }
        ],
        "permissions": {
            "can_add_remove_members": true,
            "can_promote_demote_librarians": true,
        }
    }
]
```

## Add member to organisation

```
POST /organisations/:orgid/members/:userid/
```

### Example

```
> curl -X POST http://localhost:9090/dev/api/organisations/1/members/3/
```

Returns:

```
HTTP 204 No content
```

## Remove member from organisation

```
DELETE /organisations/:orgid/members/:userid/
```

### Example

```
> curl -X DELETE http://localhost:9090/dev/api/organisations/1/members/3/
```

Returns:

```
HTTP 204 No content
```

## Set organisation user as librarian

```
POST /organisations/:orgid/librarians/:userid/
```

### Example

```
> curl -X POST http://localhost:9090/dev/api/organisation/1/librarians/5/
```

Returns:

```
HTTP 204 No content
```

## Unset organisation user as librarian

```
DELETE /organisations/:orgid/librarians/:userid/
```

### Example

```
> curl -X DELETE http://localhost:9090/dev/api/organisation/1/librarians/5/
```

Returns:

```
HTTP 204 No content
```

## List libraries

```
GET /libraries/
```

List a collection of libraries (and their library items) that is either:

a) a global library
b) a library that belongs to me,
c) a library belonging to an organisation I'm a member of
d) a library that has been shared with an organisation I'm a member of

ℹ️ porting notes: replaces previous route `assessment/loaduserlibraries`

### Example

```
> curl http://localhost:9090/v1/api/libraries/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json

[
    {
        "id": 1,
        "name": "Jane's fabric elements",
        "type": "elements",
        "data": {
            "SWU_01": {
                "tags": ["Wall"],
                "name": "225mm uninsulated brick wall",
                "description": "225mm uninslated solid brick wall, plaster internally",
                "location": "",
                "source": "Salford University on site monitoring\/ SAP table 1e, p.195",
                "uvalue": 1.9,
                "kvalue": 135,
                "g": 0,
                "gL": 0,
                "ff": 0
            },
            "SWU_02": {
                "tags": ["Wall"],
                "name": "some other type of wall",
                "description": "with another description",
                "location": "",
                "source": "Salford University on site monitoring\/ SAP table 1e, p.195",
                "uvalue": 1.9,
                "kvalue": 135,
                "g": 0,
                "gL": 0,
                "ff": 0
            }
        },
        "created_at": "2019-11-25T17:34:05.766267Z",
        "updated_at": "2019-11-25T17:34:05.766267Z",
        "permissions": {
            "can_write": true,
            "can_share": false
        },
        "owner": {
            "type": "personal",
            "id": "1",
            "name": "janedoe"
        }
    },
    {
        "name": "Jane's fabric element measures",
        "type": "draught_proofing_measures",
        "items": {
            "DP_01": {
                "name": "Basic Draught-proofing Measures",
                "q50": 12,
                "description": "This may include DIY draught-proofing measures to doors...",
                "performance": "Dependent on existing. 8-12 ...",
                "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
            },
            "DP_02": {
                "name": "Another draught proofing measure",
                "q50": 12,
                "description": "This may include DIY draught-proofing measures to doors...",
                "performance": "Dependent on existing. 8-12 ...",
                "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
            }
        },
        "created_at": "2019-11-25T17:34:05.766267Z",
        "updated_at": "2019-11-25T17:34:05.766267Z",
        "permissions": {
            "can_write": true,
            "can_share": false
        },
        "owner": {
            "type": "personal",
            "id": "1",
            "name": "janedoe"
        }
    }
]
```

## Create a library

```
POST /libraries/
```

ℹ️ porting notes: replaces previous `assessment/newlibrary` route. It can also add data in a
single request, where the previous route required the subsequent use of `savelibrary`

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/libraries/ \
    --data @- << EOF
{
    "name": "StandardLibrary - user",
    "type": "draught_proofing_measures",
    "data": {
        "DP_01": {
            "name": "Basic Draught-proofing Measures",
            "q50": 12,
            "description": "This may include DIY draught-proofing measures to doors...",
            "performance": "Dependent on existing. 8-12 ...",
            "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
        },
        "DP_02": {
            "name": "Another draught proofing measure",
            "q50": 12,
            "description": "This may include DIY draught-proofing measures to doors...",
            "performance": "Dependent on existing. 8-12 ...",
            "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
        }
}
```

Returns:

```
HTTP 204 No content
```

## Create a library for organisation

```
POST /organisations/:id/libraries/
```

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v2/api/organisations/1/libraries/ \
    --data @- << EOF
{
    "name": "My organisation library",
    "type": "draught_proofing_measures",
    "data": {
        "DP_01": {
            "name": "Basic Draught-proofing Measures",
            "q50": 12,
            "description": "This may include DIY draught-proofing measures to doors...",
            "performance": "Dependent on existing. 8-12 ...",
            "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
        },
        "DP_02": {
            "name": "Another draught proofing measure",
            "q50": 12,
            "description": "This may include DIY draught-proofing measures to doors...",
            "performance": "Dependent on existing. 8-12 ...",
            "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
        }
}
```

Returns:

```
HTTP 204 No content
```

## Update a library

```
PATCH /libraries/:id/
Content-Type: application/json
```

ℹ️ porting notes: replaces previous `assessment/savelibrary` route.

### Example: update the `data` field

```
> curl -v \
    -X PATCH \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/libraries/1/ \
    --data @- << EOF
{
    "data": {},
}
EOF
```

Returns:

```
HTTP 204 No content
```

## Share an organisation library with another organisation

```
POST /organisations/:orgid/libraries/:libraryid/shares/:otherorgid/
```

### Example

```
> curl -v -X POST http://localhost:9090/dev/api/organisation/1/libraries/5/shares/2/ \
```

## Unshare an organisation library with another organisation

```
DELETE /organisations/:orgid/libraries/:libraryid/shares/:otherorgid/
```

Returns:

```
HTTP 204 No content
```

### Example

```
> curl -v -X DELETE http://localhost:9090/dev/api/organisation/1/libraries/5/shares/2/ \
```

## List organisations a library is shared with

For a given library that belongs to an organisation, list any organisations the library is shared
with.

```
GET /organisations/:orgid/libraries/:libraryid/shares/
```

### Example

```
> curl http://localhost:9090/dev/api/organisation/1/libraries/5/shares/ \
```

Returns:

```
HTTP 200 OK
Content-Type: application/json
[
    {
        "id": "1",
        "name": "Chigley Community Energy"
    },
    {
        "id": "2",
        "name": "Sandford Assessment CIC"
    }
]
```


## Delete a library

```
DELETE /librarys/:id/
```

ℹ️ porting notes: replaces previous `assessment/deletelibrary` route.

### Example

```
> curl -v \
    -X DELETE \
    http://localhost:9090/v1/api/libraries/1/
```

Returns:

```
HTTP 204 No content
```

## Create item in library

```
POST /libraries/:id/items/
```

ℹ️ porting notes: replaces previous `assessment/additemtolibrary` route.

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/libraries/1/items/ \
    --data @- << EOF
{
    "tag": "SWIN_04",
    "item": {
        "name": "100-140mm External Wall Insulation EWI on filled cavity wall.",
        "source": "URBED/ SAP table 1e, p.195",
        "uvalue": 0.15,
        "kvalue": 110,
        "tags": ["Wall"]
    }
}
EOF
```

Returns:

```
HTTP 204 No content
```

## Update item in library

```
PUT /libraries/:id/items/:tag/
```

ℹ️ porting notes: replaces previous `assessment/edititeminlibrary` route.

### Example

```
> curl -v \
    -X PUT \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/libraries/1/item/SWIN_04/ \
    --data @- << EOF
{
    "name": "100-140mm External Wall Insulation EWI on filled cavity wall.",
    "source": "URBED/ SAP table 1e, p.195",
    "uvalue": 0.15,
    "kvalue": 110,
    "tags": ["Wall"]
}
EOF
```

Returns:

```
HTTP 204 No content
```

## Delete item in library

```
DELETE /libraries/:id/items/:tag/
```

ℹ️ porting notes: replaces previous `assessment/deletelibraryitem` route.

### Example

```
> curl -v -X DELETE \
    http://localhost:9090/v1/api/libraries/1/item/SWIN_04/
```

Returns:

```
HTTP 204 No content
```
