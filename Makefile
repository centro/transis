SOURCES = $(wildcard src/*.js)
SPECS   = $(wildcard spec/*.js)

ES5_SOURCES = $(SOURCES:src/%.js=dist/%.js)
ES5_SPECS   = $(SPECS:spec/%.js=dist/spec/%.js)

default: spec

basis: $(ES5_SOURCES)

dist/basis.js: $(ES5_SOURCES)
	./node_modules/.bin/browserify dist/index.js --s Basis > $@

dist/basis.min.js: dist/basis.js
	./node_modules/.bin/uglifyjs dist/basis.js > $@

dist/%.js: src/%.js
	@mkdir -p dist
	./node_modules/.bin/babel $< -o $@

dist/spec/%.js: spec/%.js
	@mkdir -p dist/spec
	./node_modules/.bin/babel $< -o $@

SPEC ?=
spec_node: basis $(ES5_SPECS)
	./node_modules/.bin/jasmine $(SPEC)

spec_browser: dist/basis.js $(ES5_SPECS)
	./node_modules/karma/bin/karma start ./karma.config.js

spec: spec_node spec_browser

dist: spec dist/basis.js dist/basis.min.js

repl: basis
	env NODE_NO_READLINE=1 rlwrap node ./util/repl.js

clean:
	rm -rf ./dist

.PHONY: default clean spec spec_node spec_browser dist
