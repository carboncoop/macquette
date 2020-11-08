Reports
=======

The 'reporting' used to be implemented as git submodules which were included in certain places and conditionally included.  This was because there were liability issues around the report contents - essentially, if a random householder used MHEP to produce their own report that uses Carbon Co-op text and surrounding info about methodology, then CC/Marianne is potentially liable if that information is incorrect!  So the liability issue was solved by moving things into git submodules that weren't part of the open-source project.  I wanted to remove git submodules because they are a PITA for making reliable atomic deployments (openfuvc was included this way too).

To replace this system I reworked it so the report template is stored in the db as a text field on an Organisation.  It's a nunjucks template, rendered client-side.  The JS produces a big context dictionary/object feeding in all the relevant info from other places to render it, and then inserts graphs.

I chose nunjucks because the syntax is basically a JS-y version of Django templates, so it should be familiar.  The template is rendered into an iframe so it's a standalone document, unaffected by global UI styles.

Each organisation has its own report; CAfS for example has a very straightforward copy of CC's with few alterations.  Futureproof Bristol doesn't have a report template yet.

Right now this is a bit of a hack - it's the simplest thing that could work to get v2 out of the door.  The process I use to edit the report:

1. Copy and paste the report from the production site Carbon Co-op template using Django admin into a text editor
2. Create an assessment on the local dev app, create an org and insert the template into that org
3. Edit it in the text editor, paste it into the org in the Django admin, test, rinse and repeat
4. Put it back onto the production site

Then when the Carbon Co-op one is done...

1. Find the commented out bits labelled 'CAfS' or similar in the text editor, uncomment them and then comment out the bit of Carbon Co-op stuff that it replaces
2. Test locally
3. Save into the production organisation
4. Reverse the uncommenting in my text editor.

I think there's still some drawings that need inserting.  I was going to put these in as SVG diagrams in-line into the HTML.  Some graphs might need modifying still - I found it very easy to break them though so make sure you have a fully-loaded test assessment to look at the results if you do modify them.  You can get one of these by making a copy of one I have on staging (probably called 'test' or 'fnord') - you can do this by just copy and pasting the JSON data blob to new assessment in the Django admin.

The future plans for reports (v3+):
- replace the bar charts library with SVG generation (currently uses canvas, which produces bad print output) - in the process switching most of them to more space-efficient horizontal bar charts (the print output often looks awful because the charts take up 3/4 of a page it makes the text flow badly)
- send the generated report as a blog to the server to generate PDFs with page numbers, better formatting, and a table of contents with page numbers.  There's a nice python lib for this, weasyprint.
- split out the report into a separate model which is shared among different orgs.  Each org would then have a set of key-value pairs (likely just a JSON dictionary of strings<->strings) that are passed along through the context into the template - so when we have 3+ different templates to edit with minor variations between them it's possible to keep on top of them and not miss stuff out.  Maybe also including revisioning to avoid accidentally nuking important things.  Some of this might be gold-plating, but the reports are the most important thing for the householder so avoiding accidental fuckups is quite a high priority for me, and the current system of editing things in three different places and using comments is pretty error-prone.
