# Self-documenting makefile
# https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html

.PHONY: help docs

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ----------------------------------------------------------------------------

dev: docker-up ## Bring docker up and run the local server
	python manage.py runserver

pip-compile:  ## Recompile requirements file after a change
	pip-compile -q --output-file=requirements/production.txt requirements/production.in
	pip-compile -q --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

pip-upgrade:  ## Compile new requirements files with the latest pkg (make pip-upgrade pkg=...)
	pip-compile -qP $(pkg) --output-file=requirements/production.txt requirements/production.in
	pip-compile -qP $(pkg) --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

pip-upgrade-all:  ## Compile new requirements files with latest possible versions of everything (be careful!)
	pip-compile -qU --output-file=requirements/production.txt requirements/production.in
	pip-compile -qU --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

pip-sync:  ## Make the local installed packages reflect the ones in the local requirements
	pip-sync requirements/local.txt

docker-up:  ## Bring up our local docker containers
	docker-compose -p macquette -f scripts/local.yml up --no-start
	docker-compose -p macquette -f scripts/local.yml start

docker-down:  ## Shut down our local docker containers
	docker-compose -p macquette -f scripts/local.yml stop

docker-clean:  ## Clean system volumes (helpful for resetting broken databases)
	docker system prune --volumes -f

coverage:  ## Run tests & generate line-by-line coverage
	pytest --cov=mhep
	coverage html

upversion:  ## Mint a new version
	scripts/upversion.sh

test:  ## Run tests and flake8
	pytest --cov=mhep
	flake8 mhep

docs:  ## Build HTML docs (for other options run make in docs/)
	make -C docs/ html
	echo
	echo "URL: file://`pwd`/docs/_build/html/index.html"
