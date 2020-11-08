Folder Layout
-------------
The repository includes the new Django application at `mhep` and the older PHP application at `mhep-emoncms`.
All further development is done on the Django application.


The versioning system
---------------------
MHEP is messy and very difficult to modify without breaking things, partially because all data is just JSON blobs.
However, there is a requirement for backwards-compatibility for any assessment for at least 5 years for liability reasons.
Because of this we chose to make a versioning scheme where the entire app, HTML, JS, models and all, are preserved in each version.
Think desktop software: Office 2005, Office 2008 etc.  Work is done on the 'dev' version and when it's ready, it's minted as a new version.
The idea is that when a version has been released, ideally nothing gets changed - but failing that, anything that affects calculations doesn't get changed.
Version 1 is roughly equivalent to the old MHEP in PHP, but missing some non-core stuff.
Version 2 is the currently in use version.

This is clearly a stopgap solution and won't scale past 10 or so versions.
The idea is to over time refactor the code (with cast-iron tests) such that we know 5-year old data will always be accessible.
But we're some way off that. In the meantime, we get some freedom to refactor and rework with each new version without worrying about breaking everything in the previous version.

Anyways, the versioning scheme didn't quite go to plan (what does??).
I've been making changes to v2 in-place after it was released because it was released before what I thought was a hard deadline... but that turned out to be quite a soft one, as there was a lot more work to be done.
So I've been making changes to the 'dev' app and testing them there and on staging.
Then when they're ready, I've been porting them over to v2 by copying the modified files across from one app to the other.  Messy but it works.

Vagrant vs Docker
-----------------
There are references to vagrant in some places; this is what Ian & Paul preferred to use.
I preferred to use docker and the setup is similar to the Hub/VTN, but it uses a Makefile instead of npm to run tasks.
If you just type 'make' then you get a list of possible tasks with a line of documentation for them.  `make dev` should get you up and running.
Requirements files are the same as Hub/VTN.


Running using Docker
--------------------
First create a python virtual environment. Virtualenvwrapper (bash) or virtual fish (fish shell) are both recommended.
Using Virtual Fish, in the Django `mhep` folder run:

.. code:: bash

    vf new mhep
    vf connect

Install `pip-tools` to manage the python dependencies.

.. code:: bash

    pip install pip-tools

With your new virtual environment active, install the python dependencies by running:

.. code:: bash

    make pip-sync

The first time you run the application you need to run:

.. code:: bash

    docker-compose -f ./local.yml build


Check your `.env` file
----------------------
You will need to have a `.env` file at the root of the Django application.
This file should have a `DATABASE_URL`
The credentials in the `DATABASE_URL` should match the postgres credentials in the `locala.yml` file.
For example:

``DATABASE_URL=postgres://LmYWLIqTOZmyPvoPFgVnwgWCtJrSLjGQ:4OcGftfvqhATVNtcc2pCtgKgTM73mKawUj2ovVlScwgvf9D38nqLzKEDB81OIbmc@0.0.0.0:5432/hub``


Migrate the database
--------------------
Before your first run, you will need to migrate the database.

.. code:: bash

    python manage.py migrate


Setting Up Your Users
^^^^^^^^^^^^^^^^^^^^^

* To create an **superuser account**, use this command::

.. code:: bash

    python manage.py createsuperuser

Running the application
-----------------------
Then you can run the application using:

.. code:: bash

    make dev


Test Coverage
-------------
MHEP is an in-browser system, with a REST JSON API implemented in Django.  The backend API has high test coverage; the frontend has none.
(there is a fairly comprehensive UI testsuite but it's not up to date; it's something Ian and Paul wrote to help with the port but hasn't been kept up to date.
I didn't get round to getting it working outside Vagrant myself.)


Deployment
----------
How to deploy to the production site: you need to do this manually from AWS Elastic Beanstalk.
Wait until the staging deploy has finished, then go to the mhep-production environment and it's 'change version' or 'choose version', something like that.
Then just deploy the same thing that's deployed on staging.

Development
-----------
MHEP is an open source project.  Development happens on the master branch.
(Having more than one branch doesn't make sense really anyway because the versioning scheme serves the same purpose.)


Sentry
------
Sentry has a lot of JS errors from MHEP but from what I've seen they're not showstoppers, and a lot of them have probably been there for years.
I think there are marginal gains in trying to fix them one by one because they're caused really by poorly-defined data structures.
I'm don't think local fixes of adding "x !== undefined" checks everywhere really address the cause of the issue... in the medium term I wanted to experiment with using TypeScript to try and catch these kinds of bugs in a structured way.

