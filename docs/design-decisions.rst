Design decisions
================

Here we document some decisions and principles we worked to while
carrying out the port from emoncms.

.. _design--static-files:

Prefer static files over Django templates
-----------------------------------------

Previously, most app logic was implemented in Javascript, but there were
a number of places where things were rendered by PHP. We almost
completely eliminated this so that all data used by the app comes via
API endpoints.

The principle was to decide one way or another whether it’s a backend
(rendered HTML) app or a frontend+API app.

There were 2 notable places we *had* to use Django template functions:

1. The ``{% static %}`` template tag. This is used by both HTML files
   (for imports) and by Javascript (for dynamic loading of scripts). For
   the 2nd case, we created ``urlHelper.static(..)`` - a JS function
   which hides the use of ``{% static %}`` in a single place.
2. The ``{% url %}`` (AKA ``reverse``) template tag, for deriving the
   URL of an API endpoint. Again, we created ``urlHelper.api.*()``
   functions to wrap and hide the use of Django’s template language.

Define relationships in the API (hide from frontend)
----------------------------------------------------

The *data model* of the app - the relationships between assessments,
users, organisations and libraries - is defined in Django’s models,
views and permission classes.

The principle was to define this *only* in the API and try not to
duplicate that knowledge in the frontend.

For example: only an *organisation admin* can add or remove *librarians*
to an organisation.

That’s defined in the API. But how to render different UI to the user
depending if they’re an admin or not?

One approach would be for the Javascript to check if we’re an
organisation admin, and selectively show the buttons to add and remove
librarians.

But that would be duplicating the logic. Instead we chose to implement
``permissions`` on the organisation list endpoint:

.. code::

   "permissions": {
       "can_add_remove_members": true,
       "can_promote_demote_librarians": true,
   }

This describes what the *current user* is allowed to do in that
organisation - so the frontend code doesn’t need to understand the
current user’s roles directly.

Frontend: prefer cloning DOM templates
--------------------------------------

In the absence of a modern framework like React, the app manually
manipulates the DOM. This means that code and presentation are mixed up
and it can be hard to understand what’s going on.

For the bits of frontend we worked on (e.g. libraries manager,
organisation manager) we preferred the principle of cloning templates.

Rather than outputting table rows like this:

.. code:: javascript

   var myhtml = '<tr>';
   myhtml += 'something ';
   myhtml += '<button>' x.name + '</button';
   myhtml += '</tr>';

… we’d define a hidden template row in the HTML file:

.. code:: html

   <tr id="my-row-template" style: "display: none">
     something <button class="foo-button"></button>
   </tr>

… then clone and manipulate it from Javascript:

.. code:: javascript

   var newRow = $('#my-row-template').clone();
   newRow.removeAttr('id');

   newRow.find('.foo-button').html(x.name);
   newRow.show();

This way means you can look at the HTML and more easily understand how
the DOM is supposed to look.
