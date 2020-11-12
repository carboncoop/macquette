JavaScript framework
====================

Macquette has a small single page app JS framework.  It handles
navigation between separate views stored as pairs of HTML+JS files
and maps text inputs to model inputs and vice versa using the
nonstandard ``key`` HTML attribute.

.. note::

    We plan to phase this out and use React instead.


Global variables
----------------

The following global variables are present and available for use.

-  p: object that holds all the data for the assessment like author,
   name, status and scenarios data
-  project: object that has as properties all the scenarios in the
   assessment. And for each scenario, all its data
-  scenario :string, scenario currently displayed
-  page: current view loaded, if showing a view
-  datasets: available as part of openBEM, datasets from SAP2012 and
   more like monthly average temperature, fuel costs and emissions, etc
-  projectid
-  data: object that holds all the data for the current scenario. Using
   ``data`` is the same than using ``project[scenario]``. You will see
   it everywhere

.. note::

    We plan to phase out the use global variables where possible, so
    don't add to the above list.


The ``update()`` function
-------------------------

*  Runs the model
*  Maintains undo/redo state
*  Tells the view UI to update itself post-run
*  Saves the project input data to the server

It's called after the value of any input is changed, and in various
other places after data inserted into the assessment structure.


Views
-----

Every view must have at least the 2 following functions:

*  ``[viewname]_initUI()``
*  ``[viewname]_UpdateUI()``

``initUI`` is called when the view is loaded for the first time, and
``UpdateUI`` is called after user input when the model has run but before
the data is saved back to the server.

In many views, ``xxx_initUI`` also calls the ``xxx_UpdateUI`` function.


The ``key`` HTML attribute
--------------------------

The ``key`` attribute provides a way to map the contents of
HTML form controls to nested data in the model.  When a view is first
loaded, the value/contents of form controls  will be loaded from the
specified place, and when the value is changed, it will save it back
to the model and trigger and ``update()`` (see above).

For example, given the following HTML:

.. code:: html

    <input type="text" key="data.fabric.element.1.uvalue">

On page load, this equivalent JS is run:

..code:: javascript

   if (data.fabric.element[1].uvalue) {
      input.value = data.fabric.element[1].uvalue;
   }
   input.addEventListener("change", (event) => {
      let val = isNaN(input.value) ? input.value : parseInt(input.value, 10);
      data.fabric.element[1].uvalue = val;
      update();
   });

(``data`` in this case means the current scenario -- see above for info
on global variables).


The ``dp`` HTML attribute
-------------------------

This attribute limits the output of a field that has ``key`` set to the
specified number of decimal places.


JS + HTML file map
------------------

Each version of Macquette has its own Django app, which is a directory
inside ``mhep``.  The JS + HTML bits look like:

.. code::

  templates/VERSION/
    js/                # Various JS that needs config loaded
    view.html          # Assessment view
    assessments.html   # List of assessments view
    mhep_base.html     # Base template

  static/VERSION/
    css/               # CSS for Bootstrap 2 and Macuqette-specific stuff
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
folders, see :ref:`design--static-files`.
