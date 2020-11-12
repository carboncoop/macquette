Reports
=======

How they works
--------------

Report templates are stored in the database as a text field on an
Organisation. It's a nunjucks template, rendered client-side. The report
JavaScript produces a big context object feeding in all the relevant
info from other places to render it, and then inserts graphs.

Nunjucks is used because the syntax is a JS-y version of Django
templates so it's familiar inside Carbon Co-op, as well as being
supported by Mozilla.

The template is rendered into an iframe so it's a standalone document,
and is unaffected by global UI styles.


Liability issues
----------------

The reason reports are done this way is to avoid liabilty for people's
(mis-)use of the tool.  If a random member of the public used Macquette
to produce their own report that uses Carbon Co-op/URBED text and
surrounding info about assessment methodology, then Carbon Co-op/URBED
are potentially liable if that info is incorrect.
