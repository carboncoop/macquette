Versioning scheme
=================

It is important for professional use of Macquette that data in
assessments that were completed in the past do not become unusable.
The data that went into making assessments must remain accessible and
the calculations that were used for a given assessment must be clear.
This is a strong requirement for 5 years after an assessment is
completed (for liability purposes).

As a result, we introduced a versioning scheme, the details of which
are below.  The background to this is that around the time of the port
to Django the developers weren't confident of being able to make changes
without breaking things.

The scheme
----------

App versions are highly isolated, meaning each version has its own:

-  templates & static assets
-  URL schema (including API URLs)
-  database models

When a version is finalised, no further changes can be made that affect
the assessment data, results of calculations, or the structure of stored
data. Bug fixes could be made if they are solely UI fixes.

Initially we had a restriction that 'no further changes can be made' but
we had to relax it as there are always bugfixes, UI copy to edit, Django
code to update between versions, and so on.

Issues & future changes
-----------------------

The issue with this kind of versioning is that it's *too* complete and
won't scale very well past a few versions.  So this versioning scheme is
intended as a temporary fix while we rework the code and its
infrastructure to be sure that we're not making breaking changes.


Working with app versions
-------------------------

The app is fully versioned at the Django application level, with names
like ``v1``, ``v2`` etc.

Different app versions live under a URL prefix e.g. ``/v1/``.


Starting a new app version
--------------------------

To start working on a new version of the app, run `make upversion`.
This runs a script that copies an app version to a new version.
For example, going from ``v1`` to ``dev``:

-  copy-pastes the whole directory ``mhep/v1`` to
   ``mhep/dev``
-  renames the ``static/v1`` and ``templates/v1`` subdirectories
-  adds the new ``dev`` app to Django’s ``LOCAL_APPS`` setting and
   ``urls.py``
-  modifies the ``dev/fixtures/*.json`` files with the updated app label

Finalising an app version
-------------------------

When the ``dev`` app is finished it should be renamed to e.g. ``v2``.
