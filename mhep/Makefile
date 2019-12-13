# Self-documenting makefile
# https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html

.PHONY: help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ----------------------------------------------------------------------------

dev: docker-up ## Bring docker up and run the local server
	python manage.py runserver

pip-compile:  ## Recompile requirements file after a change
	pip-compile --output-file=requirements/local.txt requirements/local.in
	pip-compile --output-file=requirements/production.txt requirements/production.in

pip-upgrade:  ## Try to upgrade requirements files to latest available versions
	pip-compile -U --output-file=requirements/local.txt requirements/local.in
	pip-compile -U --output-file=requirements/production.txt requirements/production.in

pip-sync:  ## Make the local installed packages reflect the ones in the local requirements
	pip-sync requirements/local.txt

docker-up:  ## Bring up our local docker containers
	docker-compose -f local.yml start

docker-down:  ## Shut down our local docker containers
	docker-compose -f local.yml stop

docker-clean:  ## Clean system volumes (helpful for resetting broken databases)
	docker system prune --volumes -f

coverage:  ## Run tests & generate line-by-line coverage
	pytest --cov=mhep
	coverage html

test:  ## Run tests and flake8
	pytest --cov=mhep
	flake8 mhep


