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
that's deployed on staging.  This is a fairly rarely rare occurance so
not worth automating.

Reports
-------

Carbon Co-op specific reports are held in a private repo on GitLab.

Each organisation has its own report; CAfS for example has a very
straightforward copy of CC's with few alterations. Futureproof Bristol
doesn't have a report template yet.
