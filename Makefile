SOURCES = $(wildcard src/*.js)
SPECS   = $(wildcard spec/*.js)

ES5_SOURCES = $(SOURCES:src/%.js=build/%.js)
ES5_SPECS   = $(SPECS:spec/%.js=build/spec/%.js)

default: spec

ryno: $(ES5_SOURCES)

build/ryno.js: $(ES5_SOURCES)
	./node_modules/.bin/browserify build/index.js --s Ryno > $@

build/%.js: src/%.js
	@mkdir -p build
	./node_modules/.bin/6to5 -m commonInterop $< -o $@

build/spec/%.js: spec/%.js
	@mkdir -p build/spec
	./node_modules/.bin/6to5 -m commonInterop $< -o $@

SPEC ?= ./build/spec
spec_node: ryno $(ES5_SPECS)
	./node_modules/.bin/jasmine-node $(SPEC)

spec_browser: build/ryno.js $(ES5_SPECS)
	./node_modules/karma/bin/karma start ./spec/karma.js

spec: spec_node spec_browser

clean:
	rm -rf ./build

.PHONY: default clean spec spec_node spec_browser
