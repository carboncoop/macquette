About Macquette
===============

Macquette is a whole house energy assessment tool, which models a
building to produce a report to help householders under how their home
performs now in terms of enegy use and how it might be improved.

`Carbon Co-op <https://carbon.coop>`_, `URBED <https://urbed.coop>`_
and `OpenEnergyMonitor <https://openenergymonitor.org/>`_ have been
developing Macquette since 2012 (previously under the name 'My Home
Energy Planner').

The tool can be used to calculate the space and water heating
requirements for a home from a detailed breakdown of the building
fabric: floor, walls, roof, windows etc. It uses U-values and areas to
calculate building fabric heat loss rates, combined with calculated heat
loss from infiltration and ventilation and heat gains from solar
radiation, lighting, household appliances, cooking and occupants.

It can be used to model a building in its current form and then model
scenarios to explore the effect of undertaking measures such as adding
insulation, improving air-tightness and changing heating systems.

.. note::

    This might be useful.
    https://learn.openenergymonitor.org/sustainable-energy/building-energy-model/MyHomeEnergyPlanner


Intended users
--------------

Assessors:
   Assessors use the tool to build out recommendations for building
   works to enable a net-carbon future.

Householders:
   Householders don't use Macquette directly, but they receive a report
   when the assessment is complete. Householders have different
   aspirations but generally they want to find out what they can do to
   make their house more comfortable or have a lower carbon footprint
   -and how much that will cost!

Interested tinkerers:
   People interested in energy systems or in modelling their own house
   may also use the tool, but for Macquette this group of users is
   tertiary to the former two.


Open source model
-----------------

Macquette is open source in the sense that its code is freely available
for others to build on and use but in general its development follows
the commercial priorities of the organisations that pay for its
development.  As such we have no intentions for it to be a
‘community-driven’ open source project, though we welcome forking and
re-use in other contexts.

Macquette is used as part of People Powered Retrofit service with
non-public library data, and is branded as Home Retrofit Planner in that
context.

We have future intentions to use data from other Carbon Co-op services
in Macquette - for example, smart meter data.  We will maintain the
ability of Macquette to run without needing to connect to these services
but supporting external users is not a priority for us.


Assessment flow
---------------

.. note::

Writeup of the user story map for the assessor to be included here


History
-------

Macquette is a fork of the original MyHomeEnergyPlanner (MHEP), which
was written in PHP using the EmonCMS framework. Macquette has been
ported to Python/Django and is the software backing assessments as part
of the People Powered Retrofit project.

MHEP was originally a spreadsheet which was turned into a web
application by Trystan Lea. It was ported to Python in 2019 by Ian
Drysdale and Paul Fawkesley. It continues being developed in-house at
Carbon Co-op.

You will see ``mhep`` all over the place in the code and issue tracker.
This will change over time!
