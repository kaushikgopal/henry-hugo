# Declare non-file targets
.PHONY: default help build run site css site-watch css-watch tailscale clean post post-folder short

# Configuration variables
log ?= warn          # debug|info|warn|error
env ?= development   # development|production
drafts ?= true       # true|false

# Default target
default: run

help:		## List all available commands with descriptions
	@awk -F'##' '/^[a-zA-Z0-9_-]+:.*##/ {gsub(/:.*/, ":\t\t", $$1); printf "%s%s\n", $$1, $$2}' $(MAKEFILE_LIST) | \
		awk 'NR%2==1 {print "\033[0m" $$0} NR%2==0 {print "\033[2m" $$0}'
	@echo "\033[0m"

# === Build Targets ===

build: css site	## Build Hugo site and compile CSS (one-time)

site:		## Build Hugo site (one-time)
	@echo "🔨 Building Hugo site..."
	@hugo build \
		--cleanDestinationDir --gc --minify --printI18nWarnings \
		$(if $(filter false,$(drafts)),,--buildDrafts) \
		--logLevel $(log) \
		--environment $(env)

css:		## Compile Tailwind CSS (one-time)
	@echo "🎨 Compiling Tailwind css..."
	@npx @tailwindcss/cli \
		-i ./assets/css/input.css \
		-o ./assets/css/output.css

# === Development Targets ===

run:		## [default] Run Hugo server with CSS watcher (detects Tailscale automatically)
	@echo "🚀 Starting development environment..."
	@make -j2 site-watch css-watch

site-watch:	## Run Hugo development server (checks Tailscale status at runtime)
	@if tailscale status >/dev/null 2>&1; then \
		TAILSCALE_IP=$$(tailscale status 2>/dev/null | grep 'macOS.*-$$' | head -1 | awk '{print $$1}'); \
		if [ -n "$$TAILSCALE_IP" ]; then \
			echo "🌐 Starting Hugo server with Tailscale binding: $$TAILSCALE_IP:1390"; \
			hugo server --port=1390 --disableFastRender \
				--cleanDestinationDir --printI18nWarnings \
				$(if $(filter false,$(drafts)),,--buildDrafts) \
				--logLevel $(log) --environment $(env) \
				--bind $$TAILSCALE_IP --baseURL http://$$TAILSCALE_IP:1390; \
		else \
			echo "🏠 Starting Hugo server on localhost:1390"; \
			hugo server --port=1390 --disableFastRender \
				--cleanDestinationDir --printI18nWarnings \
				$(if $(filter false,$(drafts)),,--buildDrafts) \
				--logLevel $(log) --environment $(env); \
		fi; \
	else \
		echo "🏠 Starting Hugo server on localhost:1390"; \
		hugo server --port=1390 --disableFastRender \
			--cleanDestinationDir --printI18nWarnings \
			$(if $(filter false,$(drafts)),,--buildDrafts) \
			--logLevel $(log) --environment $(env); \
	fi

css-watch:	## Run Tailwind CSS compiler in watch mode
	@echo "🎨 Compiling Tailwind css..."
	@npx @tailwindcss/cli \
		-i ./assets/css/input.css \
		-o ./assets/css/output.css --watch

# === Tailscale Targets ===

tailscale:	## Start Tailscale funnel (explicit command - must run AFTER server is up)
	@tailscale up
	@tailscale funnel localhost:1390
	@echo "✅ Tailscale funnel active"
	@echo "   To stop: tailscale funnel localhost:1390 off"

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
