# WordPress Photos for Firefox OS

# TODOs:
- find a good crypto lib that supports AES. Google's CryptoJS supports this but its a large lib.  No shared crypto lib in ffos :(
- try editing gaia to see if the gallery can support browse photos inline vs windowed. At least request this from moz.

- Wire up the application shell and get everything in its place
- refactor js libs to use require.js
- write the models and hook them up to the api calls
- wire up the models to use indexeddb for local storage. 





# A Blank Template for Open Web Apps

The is a minimal template that has a little HTML, CSS, and js to help
you start writing an Open Web App.

This is part of the [mortar](https://github.com/mozilla/mortar/)
template collection for building Open Web Apps.

# Usage

There are a few ways to get this template:

* git clone git://github.com/mozilla/mortar-app-stub.git myapp
* volo create myapp mozilla/mortar-app-stub

If you have node installed, you can run a development server with volo:

* cd myapp
* volo serve

View the app at http://localhost:8008/.
