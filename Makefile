default: run

# Set default warning mode if not specified
# permitted values debug|info|warn|error
# e.g. usage from make cli:
#  		make build log=debug
#  		make build-site log=debug
log ?= warn

help:	## list out commands with descriptions
	@sed -ne '/@sed/!s/## //p' $(MAKEFILE_LIST)

run:	## (default) run Hugo server & watch Tailwind CSS compiler
	@## --jobs=2 parallelizes the commands
	@make -j2 run-site run-css

build:	## build the site
	@make site css

run-css:	## watch Tailwind CSS compiler
	@npx @tailwindcss/cli \
		-i themes/henry/assets/css/input.css  \
		-o ./assets/css/output.css --watch

run-site:	## run Hugo server
	@hugo \
		server \
		--bind=0.0.0.0 --disableFastRender --noHTTPCache \
		--cleanDestinationDir --gc --minify --printI18nWarnings --buildDrafts \
		--logLevel $(log)


site:	## build the site
	@hugo \
		build \
		--cleanDestinationDir --gc --minify --printI18nWarnings --buildDrafts \
		--logLevel $(log)

css:	## compile Tailwind CSS
	@touch assets/css/{output,override,override-fonts}.css
	@npx @tailwindcss/cli \
		-i themes/henry/assets/css/input.css  \
		-o ./assets/css/output.css

