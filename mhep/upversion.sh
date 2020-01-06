#!/bin/sh -eu

check_django_working() {
    ./manage.py check && DJANGO_OK=1 || DJANGO_OK=0
    if [ $DJANGO_OK -ne 1 ]; then
	echo
	echo "Run from the ./mhep directory inside the Vagrant machine"
	exit 1
    fi
}

get_latest_version() {
    ls -al mhep/
    echo
    echo "What's will the new version be called? (e.g. v3)"

    read NEW_V
}


check_destination_directory_doesnt_exist() {
    if [ -d "mhep/${NEW_V}" ]; then
	    echo "directory mhep/${NEW_V} already exists"
	    exit 1
    fi
}

copy_app_directory() {
    # copy whole app directory

    cp -R mhep/${CURRENT_V} mhep/${NEW_V}
}

rename_subdirectories() {
	echo "Renaming static/${CURRENT_V}    to static/${NEW_V}"
	echo "         templates/${CURRENT_V} to templates/${NEW_V}"

    mv mhep/${NEW_V}/static/${CURRENT_V} mhep/${NEW_V}/static/${NEW_V}
    mv mhep/${NEW_V}/templates/${CURRENT_V} mhep/${NEW_V}/templates/${NEW_V}
}


add_to_django_installed_apps() {
	echo "Adding ${NEW_V} to config/settings/base.py"

	${SED} -i "s|    # Your stuff: custom apps go here|    # Your stuff: custom apps go here\n    \"mhep.${NEW_V}.apps.AssessmentsConfig\",|g" config/settings/base.py
}

add_to_django_urls() {
	echo "Adding ${NEW_V} to config/urls.py"

	${SED} -i "s|    # Add app versions after this line|    # Add app versions after this line\n    path(\"${NEW_V}/\", include(\"mhep.${NEW_V}.urls\", namespace=\"${NEW_V}\")),|g" config/urls.py
}

create_initial_migration() {
	echo "Creating initial migration for ${NEW_V}"

	rm -rf mhep/${NEW_V}/migrations/*.py
	touch mhep/${NEW_V}/migrations/__init__.py
	./manage.py makemigrations ${NEW_V}
}

update_fixtures() {
	echo "Updating fixtures for ${NEW_V}"

	${SED} -i "s|\"model\": \"${CURRENT_V}\.|\"model\": \"${NEW_V}.|g" mhep/${NEW_V}/fixtures/*.json
}

# Needs GNU sed.
SED=${SED:=sed}
CURRENT_V="dev"
check_django_working
get_latest_version
check_destination_directory_doesnt_exist


echo "Copying mhep/${CURRENT_V} to mhep/${NEW_V}"
echo
read -p "Continue (y/n)?" choice
case "$choice" in
	y|Y ) echo "yes"
		copy_app_directory
		rename_subdirectories
		add_to_django_installed_apps
		add_to_django_urls
		create_initial_migration
		update_fixtures
		echo "Done."
		;;
	n|N ) echo "no";;
	* ) echo "invalid";;
esac
