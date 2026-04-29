# Declare non-file targets
.PHONY: default help build run site css site-watch site-watch-plain css-watch tailscale clean post post-folder short banner ensure-tailwind-bin ensure-portless agent-skill-links

# Configuration variables
log ?= warn          # debug|info|warn|error
env ?= development   # development|production
drafts ?= true       # true|false
portless_name ?= henry
hugo_port ?= 1390
TAILWIND_BIN ?= $(shell [ -x ./node_modules/.bin/tailwindcss ] && echo ./node_modules/.bin/tailwindcss || [ -x ../../node_modules/.bin/tailwindcss ] && echo ../../node_modules/.bin/tailwindcss || echo ./node_modules/.bin/tailwindcss)
PORTLESS_BIN ?= $(shell [ -x ./node_modules/.bin/portless ] && echo ./node_modules/.bin/portless || [ -x ../../node_modules/.bin/portless ] && echo ../../node_modules/.bin/portless || echo portless)

# Default target
default: run

help:		## List all available commands with descriptions
	@awk -F'##' '/^[a-zA-Z0-9_-]+:.*##/ {gsub(/:.*/, ":\t\t", $$1); printf "%s%s\n", $$1, $$2}' $(MAKEFILE_LIST) | \
		awk 'NR%2==1 {print "\033[0m" $$0} NR%2==0 {print "\033[2m" $$0}'
	@echo "\033[0m"

# === Build Targets ===

build: css site	## Build Hugo site and compile CSS (one-time)

ensure-tailwind-bin:	## Ensure a local tailwind binary is available
	@if [ ! -x "$(TAILWIND_BIN)" ]; then \
		echo "❌ Tailwind binary not found at $(TAILWIND_BIN)"; \
		echo "   Run npm ci from the site root (../..) or install deps in this theme."; \
		exit 1; \
	fi

ensure-portless:	## Ensure portless is available
	@if ! $(PORTLESS_BIN) --version >/dev/null 2>&1; then \
		echo "❌ Portless not found: $(PORTLESS_BIN)"; \
		echo "   Install with: npm install -D portless"; \
		exit 1; \
	fi

site:		## Build Hugo site (one-time)
	@echo "🔨 Building Hugo site..."
	@hugo build \
		--cleanDestinationDir --gc --minify --printI18nWarnings \
		$(if $(filter false,$(drafts)),,--buildDrafts) \
		--logLevel $(log) \
		--environment $(env)

css: ensure-tailwind-bin	## Compile Tailwind CSS (one-time)
	@echo "🎨 Compiling Tailwind css..."
	@$(TAILWIND_BIN) \
		-i ./assets/css/input.css \
		-o ./assets/css/output.css

# === Development Targets ===

run:		## [default] Run Hugo server through Portless with CSS watcher
	@echo "🚀 Starting development environment..."
	@make -j2 site-watch css-watch

site-watch: ensure-portless	## Run Hugo development server through Portless
	@echo "🌐 Starting Hugo server at https://$(portless_name).localhost"
	@$(PORTLESS_BIN) run --name "$(portless_name)" sh -c '\
		url_no_scheme=$${PORTLESS_URL#*://}; \
		case "$$url_no_scheme" in \
			*:*) live_port=$${url_no_scheme##*:}; live_port=$${live_port%%/*} ;; \
			*) case "$$PORTLESS_URL" in https://*) live_port=443 ;; *) live_port=80 ;; esac ;; \
		esac; \
		exec hugo server \
			--bind 127.0.0.1 \
			--port "$$PORT" \
			--baseURL "$$PORTLESS_URL" \
			--appendPort=false \
			--liveReloadPort "$$live_port" \
			--disableFastRender \
			--cleanDestinationDir --printI18nWarnings \
			$(if $(filter false,$(drafts)),,--buildDrafts) \
			--logLevel $(log) --environment $(env)'

site-watch-plain:	## Run Hugo development server without Portless
	@echo "🏠 Starting Hugo server on localhost:$(hugo_port)"
	@hugo server --port=$(hugo_port) --disableFastRender \
		--cleanDestinationDir --printI18nWarnings \
		$(if $(filter false,$(drafts)),,--buildDrafts) \
		--logLevel $(log) --environment $(env)

css-watch: ensure-tailwind-bin	## Run Tailwind CSS compiler in watch mode
	@echo "🎨 Compiling Tailwind css..."
	@$(TAILWIND_BIN) \
		-i ./assets/css/input.css \
		-o ./assets/css/output.css --watch

# === Tailscale Targets ===

tailscale: ensure-portless	## Run Hugo through Portless and share it on Tailscale
	@PORTLESS_TAILSCALE=1 $(MAKE) site-watch

# === Utility Targets ===

clean:		## Remove all generated files (public/, output.css)
	@echo "🧹 Cleaning generated files..."
	@rm -rf public
	@rm -f assets/css/output.css

post:		## Create new blog post (usage: make post slug=my-post-title)
	@hugo new content -k post content/blog/$$(date +%Y-%m-%d)-$(slug).md

post-folder:	## Create new blog post folder (usage: make post-folder slug=my-post-title)
	@hugo new content -k post content/blog/$$(date +%Y-%m-%d)-$(slug)/index.md

short:		## Create new short post (usage: make short slug=my-short)
	@hugo new content -k short content/blog/$$(date +%Y-%m-%d)-$(slug).md

banner:		## Generate OG banner image (usage: make banner post=content/blog/2025-01-01-my-post.md)
	@./bin/generate-banner $(post)

agent-skill-links:	## Link all Henry-owned skills into consumer sites that use themes/henry
	@./bin/agent-skill-links
