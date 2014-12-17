SOURCES = $(wildcard src/*.js)
SPECS   = $(wildcard spec/*.js)

ES5_SOURCES = $(SOURCES:src/%.js=build/%.js)
ES5_SPECS   = $(SPECS:spec/%.js=build/spec/%.js)

default: spec

ryno: $(ES5_SOURCES)

build/%.js: src/%.js
	@mkdir -p build
	./node_modules/.bin/6to5 -m commonInterop $< -o $@

build/spec/%.js: spec/%.js
	@mkdir -p build/spec
	./node_modules/.bin/6to5 -m commonInterop $< -o $@

SPEC ?= ./build/spec
spec: ryno $(ES5_SPECS)
	./node_modules/.bin/jasmine-node $(SPEC)

clean:
	rm -rf ./build

.PHONY: default clean spec
