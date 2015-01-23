SOURCES = $(wildcard src/*.js)
SPECS   = $(wildcard spec/*.js)

ES5_SOURCES = $(SOURCES:src/%.js=build/%.js)
ES5_SPECS   = $(SPECS:spec/%.js=build/spec/%.js)

default: spec

basis: $(ES5_SOURCES)

build/basis.js: $(ES5_SOURCES)
	./node_modules/.bin/browserify build/index.js --s Basis > $@

build/%.js: src/%.js
	@mkdir -p build
	./node_modules/.bin/6to5 $< -o $@

build/spec/%.js: spec/%.js
	@mkdir -p build/spec
	./node_modules/.bin/6to5 $< -o $@

SPEC ?=
spec_node: basis $(ES5_SPECS)
	./node_modules/.bin/jasmine $(SPEC)

spec_browser: build/basis.js $(ES5_SPECS)
	./node_modules/karma/bin/karma start ./spec/karma.js

spec: spec_node spec_browser

repl: basis
	env NODE_NO_READLINE=1 rlwrap node ./util/repl.js

clean:
	rm -rf ./build

.PHONY: default clean spec spec_node spec_browser
