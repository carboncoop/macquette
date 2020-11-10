Key concepts
============

Assessments and libraries
-------------------------

Macquette is a webapp for making housing energy assessments.

Assessments consists of loads of data, stored as a JSON blob in the
backend database.

Libraries are user-editable collections of the elements that can be used
in assessments in various different forms. For example, data about
different building fabrics and ventilation systems are both held in
libraries. There are also various 'measures' libraries, which hold
things that can be done to buildings to improve their energy efficiency.

Macuqette does not ship with libraries for liability reasons, but they
are loaded in via the UI (or CLI).

Reports
-------

Reports are ultimately what the tool produces in commercial use. They
presently take the form of HTML templates that are converted to PDF in
the browser for sending to householders.

Report templates are not shipped with Macquette because they are very
context-specific and we don't want to give the impression that URBED or
Carbon Co-op endorse the results of an untrained person using the tool.

Versions
--------

Macquette assessments need to be readable until five years after they
are created, again for liability reasons. Macquette's design is
currently not well-suited to maintaining backwards compatibility, and so
we run each version side-by-side with others. Once an app version is
minted, no changes that modify the outcome of its calculations are
allowed.

Over time we are planning to redesign the app so that we can make
substantial updates without forking the code, as having seven versions
to maintain at once would obviously be a nightmare. You can read more on
the page about versioning.

Users and organisations
-----------------------

Macquette supports making assessments and libraries as a solo user, but
it's a multi-user app in use at Carbon Co-op, with different levels of
permissions within organisation groups. For example, library access is
controlled: people in an organisation can use that organisation's
libraries, but only someone with the *librarian* role can edit them.

At Carbon Co-op, we run Macquette with single-sign on provided by Auth0.
See more on the Carbon Co-op-specific page.
