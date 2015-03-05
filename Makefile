SOURCES = $(wildcard src/*.js)
SPECS   = $(wildcard spec/*.js)

ES5_SOURCES = $(SOURCES:src/%.js=dist/%.js)
ES5_SPECS   = $(SPECS:spec/%.js=dist/spec/%.js)

default: spec

basis: $(ES5_SOURCES)

dist/basis.js: $(SOURCES)
	./node_modules/.bin/webpack --output-file $@

dist/basis.min.js: $(SOURCES)
	./node_modules/.bin/webpack -p --output-file $@

dist/%.js: src/%.js
	@mkdir -p dist
	./node_modules/.bin/babel $< -o $@

dist/spec/%.js: spec/%.js
	@mkdir -p dist/spec
	./node_modules/.bin/babel $< -o $@

dist: basis dist/basis.js dist/basis.min.js

SPEC ?=
spec_node: basis $(ES5_SPECS)
	./node_modules/.bin/jasmine $(SPEC)

spec_browser: basis $(ES5_SPECS)
	./node_modules/karma/bin/karma start ./karma.config.js

spec: spec_node spec_browser

repl: basis
	env NODE_NO_READLINE=1 rlwrap node ./util/repl.js

clean:
	rm -rf ./dist

.PHONY: basis default clean spec spec_node spec_browser dist
