Carbon Co-op Internal Notes
===========================

Websites
--------

Websites are mhep.carbon.coop and mhep-staging.carbon.coop. To log in
you will have to give yourself the right permissions on auth0 - there
are some roles set up for this, both for basic access but also
staff/superuser access. Locally it's the same as the hub, there's an env
var you can change to switch between Auth0 and not.

Deployment
----------

How to deploy to the production site: you need to do this manually from
AWS Elastic Beanstalk. Wait until the staging deploy has finished, then
go to the mhep-production environment and it's 'change version' or
'choose version', something like that. Then just deploy the same thing
that's deployed on staging.

Sentry
------

Sentry has a lot of JS errors from MHEP but from what I've seen they're
not showstoppers, and a lot of them have probably been there for years.
I think there are marginal gains in trying to fix them one by one
because they're caused really by poorly-defined data structures. I'm
don't think local fixes of adding "x !== undefined" checks everywhere
really address the cause of the issue... in the medium term I wanted to
experiment with using TypeScript to try and catch these kinds of bugs in
a structured way.
