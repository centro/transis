# Change Log
All notable changes to this project will be documented in this file. This project adheres to
[Semantic Versioning](http://semver.org/).

## [0.12.0]
### Changed
- Run a flush cycle before calling model promise callbacks. [#50](https://github.com/centro/transis/pull/50)

### Added
- Add support for chained computed prop dependencies. [#51](https://github.com/centro/transis/pull/51)

## [0.11.1]
### Fixed
- Fix use of the deprecated `isMounted` call in React mixin. [#47](https://github.com/centro/transis/pull/47)

## [0.11.0]
### Added
- Add support for more flexible date parsing. [#46](https://github.com/centro/transis/pull/46)

## [0.10.0]
### Added
- Add support for the `currentOpts` prop on query arrays. [#43](https://github.com/centro/transis/pull/43)

## [0.9.0]
### Added
- Add support for paged query arrays. [#41](https://github.com/centro/transis/pull/41)

## [0.8.1]
### Fixed
- Fix React mixin to handle manual property change notifications. [#38](https://github.com/centro/transis/pull/38)

## [0.8.0]
### Changed
- React mixin performance enhancement. [#35](https://github.com/centro/transis/pull/35)
- Upgrade dependencies. [#37](https://github.com/centro/transis/pull/37)

### Fixed
- Update email parser to handle emails with subdomains. [#36](https://github.com/centro/transis/pull/36)

## [0.7.0]
### Changed
- Avoid notifying observers when setting a prop to the same value. [#31](https://github.com/centro/transis/pull/31)
- Avoid notifying observers when changes and errors are cleared. [#32](https://github.com/centro/transis/pull/32)

## [0.6.0]
### Added
- Update Model.buildQuery to accept options that get forwarded to mapper when query is called. [#29](https://github.com/centro/transis/pull/29)

## [0.5.0]
### Fixed
- Optimize flush calls. This greatly improves processing time when loading a lot of data at once. [#26](https://github.com/centro/transis/pull/26)

### Added
- Update undoChanges method to accept an only option. [#25](https://github.com/centro/transis/pull/25)

## [0.4.0]
### Fixed
- Allows parent classes to resolve subclasses when loading data. [#24](https://github.com/centro/transis/pull/24)

## [0.3.1]
### Fixed
- Gracefully handle receiving an id already in the id map on a create. [#21](https://github.com/centro/transis/pull/21)

## [0.3.0]
### Added
- Transis.reset. [#20](https://github.com/centro/transis/pull/20)

## [0.2.0]
### Added
- Contextual validation support. [#19](https://github.com/centro/transis/pull/19)

### Changed
- Updated dev dependencies.

## [0.1.0]
- Initial public release.
