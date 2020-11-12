JavaScript framework
====================

Javascript global variables in an assessment
--------------------------------------------

The following variables can be used in your views javascript:

-  p: object that holds all the data for the assessment like author,
   name, status and scenarios data
-  project: object that has as properties all the scenarios in the
   assessment. And for each scenario, all its data
-  scenario :string, scenario currently displayed
-  page: current view loaded, if showing a view
-  report: current report loaded, if showing a report
-  datasets: available as part of openBEM, datasets from SAP2012 and
   more like monthly average temperature, fuel costs and emissions, etc
-  projectid
-  data: object that holds all the data for the current scenario. Using
   ``data`` is the same than using ``project[scenario]``. You will see
   it everywhere

Working with views
------------------

Every view must have the 2 following functions:

``[viewname]_initUI()``

called when the view is loaded for the first time

``[viewname]_UpdateUI()``

called every time the update function is called (see *The update()
function* below), Quite often these two function overlap and one gets
called from the other.

The update() function
---------------------

Defined in view.php. It fetches all the inputs in the view and the rest
of the scenario data and runs it through the model. Once the result of
the calculations are sent back it calls the viewname_UpdateUI() function
so that the view can be updated with the results. It also sends all the
assessment data to the server to save it in the database.

How to use the key attribute in an html tag
-------------------------------------------

MHEP is a kind of framework in which inputs/selects/texts tags with the
key attribute will call the update function when they change. Also they
and any other tag with the key attribute will be automatically updated
if its source data changes. Trying to make it more understandable:

-  We are in the “Basic dwelling data” page (context view)
-  In the view you can find ``<input type="text" key="data.altitude" style="width:60px">``
-  When we load the view, that input will automatically be filled with the value in ``data.altitude``, remember this is equivalent to ``project[current_scencario].altitude`` - When we manually change the value of the input, ``data.altitude`` will change and the update function will be called (triggering the model calculation and saving the assessment in the database).



JS + HTML files
~~~~~~~~~~~~~~~

Each version of Macquette has its own Django app, which is a directory
inside ``mhep``.


.. code::

  templates/VERSION/
    js/                # Various JS that needs config loaded
    view.html          # Assessment view
    assessments.html   # List of assessments view
    mhep_base.html     # Base template

  static/VERSION/
    css/               # CSS for Bootstrap 2 and MHEP-specific stuff
    img/               # Low-res icons we want to replace with SVG

    js/
      ... various out of date libraries ...
      library-helper/   # Library management JS + HTML (gnarly)
      openbem/          # Building physics model/calculator
      openFUVC/         # Floor :ref:`term-u-value` calculator; used to separate repo
      extended-library-items.js   # A single extended library item; a hack
      api.js            # API communication module
      misc.js           # Some of the JS framework
      graphics.js       # Draws the house and some bar graphs

    subviews/        # Pairs of files containing HTML + JS for each view
      [name].{js,html}
      [name].{js,html}


For info on why the HTML + JS is split between the static and templates
folders, see design decisions. XXX




What gets saved in the database
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Macquette doesn't save the results of its calculations in the database;
only the inputs.  Before the assessment data gets sent to the server,
extract_inputdata() in mhep-helper.js removes any output data.

it's a big mutable blob.  the input and the output data are not distinct.

so if you want to add more inputs, you have to tell extract_inputdata
about them.  urgh.

.. note::

    This should change, so we can test new versions against existing
    assessments to ensure the output doesn't change.
