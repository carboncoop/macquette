About Macquette
===============

Macquette is a whole house energy assessment tool, which models a
building to produce a report to help householders under how their home
performs now in terms of enegy use and how it might be improved.

`Carbon Co-op <https://carbon.coop>`_,
`URBED <https://urbed.coop>`_ and
`OpenEnergyMonitor <https://openenergymonitor.org/>`_ have been developing
Macquette since 2012 (previously under the name 'My Home Energy Planner').

The tool can be used to calculate the space and water heating
requirements for a home from a detailed breakdown of the building fabric:
floor, walls, roof, windows etc. It uses U-values and areas to calculate
building fabric heat loss rates, combined with calculated heat loss from
infiltration and ventilation and heat gains from solar radiation,
lighting, household appliances, cooking and occupants.

It can be used to model a building in its current form and then model
scenarios to explore the effect of undertaking measures such as adding
insulation, improving air-tightness and changing heating systems.

.. note::

    This might be useful.
    https://learn.openenergymonitor.org/sustainable-energy/building-energy-model/MyHomeEnergyPlanner


Assessment flow
---------------

.. note::

    Writeup of the user story map for the assessor to be included here


History
-------

Macquette is a fork of the original MyHomeEnergyPlanner (MHEP), which was
written in PHP using the EmonCMS framework.  Macquette has been ported
to Python/Django and is the software backing assessments as part of
the People Powered Retrofit project.

MHEP was originally a spreadsheet which was turned into a web
application by Trystan Lea.  It was ported to Python in 2019 by Ian
Drysdale and Paul Fawkesley.  It continues being developed in-house
at Carbon Co-op.

You will see ``mhep`` all over the place in the code and issue tracker.
This will change over time!
