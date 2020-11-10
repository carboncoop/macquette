Versioning scheme
=================

https://docs.google.com/document/d/1BInVQEqQLjfsgMuxw3Q4dU18fn5m9E-V2jXAD87Q05o/edit#


MHEP versioning proposal
This proposal, if adopted, removes the need for a separate “archive report”.


Introduction

It is important for professional use of MHEP that old data is not lost and does not become unusable.  This has happened in the past but we need to ensure that it does not happen in the future.

One way of ensuring this is by always using the same version of the application when viewing or editing a given assessment.  For example, Word 2013 and Word 2007 had different file formats.  Most office workers have opened an older Word document in a newer version of Word at some point.  Sometimes this works fine, and sometimes there’s data loss.

However, if you could just run Word 2013 for its files, and Word 2007 for its files, this problem wouldn’t occur.  That is effectively what this document proposes.


Model version

A 'version' of MHEP is a bundle of all the assets required to display, edit, and run an assessment (in other words, all the HTML, JS, and CSS files).  It's identified by an incrementing number (1, 2, 3...).  Version 1 is the version currently running on EmonCMS as of October 2019 (and thus the first version running on Django).

When a version is finalised, no further changes can be made that affect the assessment data, results of calculations, or the structure of stored data.  Bug fixes could be made if they are solely UI fixes.

Every assessment stores the version number it was made with.  When it is loaded, the browser is sent the asset bundle corresponding to that version.

At some point we will need a route for migrations between one version and another, but this is not required at the moment.

Notes:
We will want to stop OpemBEM being loaded from a CDN as part of this work, and instead included in the repository (not using git submodules!)
Reports will also need to be part of the bundle


Library version

In the above scheme, libraries will need to be versioned too.  This is a separate versioning scheme to the MHEP version.  Every edit to a library will need to store it as a new entity, not overwriting the old one.

Does every assessment currently have its own copy of a library?  If so, maybe we can avoid versioning libraries for now. If not, we need the assessment to reference library version(s) too.






The versioning system
---------------------

MHEP is messy and very difficult to modify without breaking things,
partially because all data is just JSON blobs. However, there is a
requirement for backwards-compatibility for any assessment for at least
5 years for liability reasons. Because of this we chose to make a
versioning scheme where the entire app, HTML, JS, models and all, are
preserved in each version. Think desktop software: Office 2005, Office
2008 etc. Work is done on the 'dev' version and when it's ready, it's
minted as a new version. The idea is that when a version has been
released, ideally nothing gets changed - but failing that, anything that
affects calculations doesn't get changed. Version 1 is roughly
equivalent to the old MHEP in PHP, but missing some non-core stuff.
Version 2 is the currently in use version.

This is clearly a stopgap solution and won't scale past 10 or so
versions. The idea is to over time refactor the code (with cast-iron
tests) such that we know 5-year old data will always be accessible. But
we're some way off that. In the meantime, we get some freedom to
refactor and rework with each new version without worrying about
breaking everything in the previous version.

Anyways, the versioning scheme didn't quite go to plan (what does??).
I've been making changes to v2 in-place after it was released because it
was released before what I thought was a hard deadline... but that
turned out to be quite a soft one, as there was a lot more work to be
done. So I've been making changes to the 'dev' app and testing them
there and on staging. Then when they're ready, I've been porting them
over to v2 by copying the modified files across from one app to the
other. Messy but it works.

Working with app versions
~~~~~~~~~~~~~~~~~~~~~~~~~

The app is fully versioned at the Django application level, with names
like ``v1``, ``v2`` etc.

Different app versions live under a URL prefix e.g. ``/v1/``.

App versions are highly isolated, meaning each version has its own:

-  templates & static assets
-  URL schema (including API URLs)
-  database models

Starting a new app version
--------------------------

To start working on a new version of the app, cd into ``./mhep`` and run
the script :literal:`\`upversion.sh`
<https://github.com/mhep-transition/mhep-django/blob/master/mhep/upversion.sh>__
and set the new version as dev.

The script copies an app version to a new version, for example, going
from v1\` to ``dev``:

-  copy-pastes the whole directory ``mhep/mhep/v1`` to
   ``/mhep/mhep/dev``
-  renames the ``static/v1`` and ``templates/v1`` subdirectories
-  adds the new ``dev`` app to Django’s ``LOCAL_APPS`` setting and
   ``urls.py``
-  modifies the ``dev/fixtures/*.json`` files with the updated app label

Finalising an app version
-------------------------

When the ``dev`` app is finished it should be renamed to e.g. ``v2``.

Once an app is assigned a version number its code should never be
modified again.
