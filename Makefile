SOURCES = $(wildcard src/*.js)
SPECS   = $(wildcard spec/*.js)

ES5_SOURCES = $(SOURCES:src/%.js=dist/%.js)
ES5_SPECS   = $(SPECS:spec/%.js=dist/spec/%.js)

VERSION = $(shell node -e "console.log(JSON.parse(require('fs').readFileSync('./package.json')).version)")

default: spec

transis: $(ES5_SOURCES)

dist/transis.js: $(SOURCES)
	./node_modules/.bin/webpack --output-filename $@

dist/%.js: src/%.js
	@mkdir -p dist
	./node_modules/.bin/babel $< -o $@

dist/spec/%.js: spec/%.js
	@mkdir -p dist/spec
	./node_modules/.bin/babel $< -o $@

package: dist/transis.js

SPEC ?=
spec_node: transis $(ES5_SPECS)
	./node_modules/.bin/jasmine $(SPEC)

spec_browser: transis $(ES5_SPECS)
	./node_modules/karma/bin/karma start ./karma.config.js

spec: spec_node spec_browser

repl: transis
	env NODE_NO_READLINE=1 rlwrap node ./util/repl.js

release: transis
	@echo Releasing $(VERSION)...
	@grep -q "\[$(VERSION)\]" ./CHANGELOG.md || (echo "Missing CHANGELOG entry for $(VERSION)" && false)
	npm publish
	git tag -a v$(VERSION) -m '$(VERSION) release'
	git push origin v$(VERSION)

examples: package
	./node_modules/.bin/http-server ./examples

clean:
	rm -rf ./dist

.PHONY: transis default clean spec spec_node spec_browser dist release
