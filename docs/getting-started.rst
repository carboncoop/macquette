Getting started
===============

The repository is set up with a development environment that uses Docker
to provide a PostgreSQL database so you don't have to set one up
yourself. It doesn't use Docker to run the app itself though.

Installing system dependencies
------------------------------

You will need:

-  Docker <https://www.docker.com/>, with Compose
   <https://docs.docker.com/compose/install/>
-  Python 3.7 and pip <https://pip.pypa.io/en/stable/installing/>
-  GNU make

Debian / Ubuntu
~~~~~~~~~~~~~~~

``apt install docker.io docker-compose make python3.7``

Make sure your user is in the ``docker`` group, by running
``sudo usermod -a -G docker <username>``.

Setting up your Python environment
----------------------------------

bash shell
~~~~~~~~~~

Here's a recipe for using ``virtualenvwrapper`` to manage your Python
environments. If you're not sure what this means, RealPython has a
`solid article about Python virtualenvs <https://realpython.com/python-virtual-environments-a-primer/>`_.

First, follow virtualenvwrapper's `installation
instructions <https://virtualenvwrapper.readthedocs.io/en/latest/install.html>`__.

To create a new virtual environment, run:

.. code:: bash

   mkvirtualenv -a . -p /usr/bin/python3.7 cc-macquette

Your new virtualenv will be activated. To reactivate later, use 'workon
cc-macquette'.

Fish shell
~~~~~~~~~~

First create a python virtual environment. Using
`Virtual Fish <https://github.com/justinmayer/virtualfish>`_, run:

.. code:: bash

   vf new cc-macquette
   vf connect

Set up and run Macquette
------------------------

.. code:: bash

   pip install pip-tools             # Install pip-tools to manage dependencies
   make pip-sync                     # Install our Python dependencies
   cp .example.env .env              # Set up env vars for local dev
   pre-commit install                # Set up pre-commit code linters
   make docker-up                    # Start postgres docker container
   python manage.py migrate          # Migrate the database
   python manage.py createsuperuser  # Create a user account
   make dev                          # Bring up Macquette

What is happening here?
~~~~~~~~~~~~~~~~~~~~~~~

-  We use ``pip-tools`` to manage our Python dependencies so that we
   keep the same versions between local development and production.
-  Many common tasks are kept in our Makefile so you don't have to
   remember CLI incantations. It's also a self-documenting Makefile -so
   to see what commands are available, just type ``make`` and you will
   see a list of available tasks.
-  The tool ``pip-sync`` is part of the tools, and it will make sure
   that the Python packages installed locally exactly match those
   specified in a given file. In this case, we run it via the Makefile
   which means we don't have to type out the full command.
-  In local development, Macquette looks for settings in a ``.env`` file
   in the project root. Without one of these, it doesn't know where to
   find the database.
-  We use `pre-commit <https://pre-commit.com/>`__ to run various
   linters and code quality checks on commit. We also run it as part of
   our CI.
-  ``make docker-up`` sets up our Docker environment. At the moment this
   is just PostgreSQL, which is run using a ``docker-compose`` file
   stored in ``scripts/``. This file tells Docker what username,
   password and database to use. These credentials match the ones in
   .example.env.
-  The Django framework gives us for database migrations. manage.py is
   the standard CLI interface to Django tools, and its migrate command
   runs all migrations that aren't already run (which in this case is
   all of them). The database is ready after this.
-  You need a user or you can't use the app!
-  ``make dev`` is again a shortcut that makes sure that our Docker
   containers are running and runs Macquette.
