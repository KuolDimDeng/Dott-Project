"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/@smithy+querystring-parser@4.0.2";
exports.ids = ["vendor-chunks/@smithy+querystring-parser@4.0.2"];
exports.modules = {

/***/ "(ssr)/../../node_modules/.pnpm/@smithy+querystring-parser@4.0.2/node_modules/@smithy/querystring-parser/dist-es/index.js":
/*!**************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@smithy+querystring-parser@4.0.2/node_modules/@smithy/querystring-parser/dist-es/index.js ***!
  \**************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   parseQueryString: () => (/* binding */ parseQueryString)\n/* harmony export */ });\nfunction parseQueryString(querystring) {\n    const query = {};\n    querystring = querystring.replace(/^\\?/, \"\");\n    if (querystring) {\n        for (const pair of querystring.split(\"&\")) {\n            let [key, value = null] = pair.split(\"=\");\n            key = decodeURIComponent(key);\n            if (value) {\n                value = decodeURIComponent(value);\n            }\n            if (!(key in query)) {\n                query[key] = value;\n            }\n            else if (Array.isArray(query[key])) {\n                query[key].push(value);\n            }\n            else {\n                query[key] = [query[key], value];\n            }\n        }\n    }\n    return query;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0BzbWl0aHkrcXVlcnlzdHJpbmctcGFyc2VyQDQuMC4yL25vZGVfbW9kdWxlcy9Ac21pdGh5L3F1ZXJ5c3RyaW5nLXBhcnNlci9kaXN0LWVzL2luZGV4LmpzIiwibWFwcGluZ3MiOiI7Ozs7QUFBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyIvVXNlcnMva3VvbGRlbmcvcHJvamVjdHgvbm9kZV9tb2R1bGVzLy5wbnBtL0BzbWl0aHkrcXVlcnlzdHJpbmctcGFyc2VyQDQuMC4yL25vZGVfbW9kdWxlcy9Ac21pdGh5L3F1ZXJ5c3RyaW5nLXBhcnNlci9kaXN0LWVzL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBwYXJzZVF1ZXJ5U3RyaW5nKHF1ZXJ5c3RyaW5nKSB7XG4gICAgY29uc3QgcXVlcnkgPSB7fTtcbiAgICBxdWVyeXN0cmluZyA9IHF1ZXJ5c3RyaW5nLnJlcGxhY2UoL15cXD8vLCBcIlwiKTtcbiAgICBpZiAocXVlcnlzdHJpbmcpIHtcbiAgICAgICAgZm9yIChjb25zdCBwYWlyIG9mIHF1ZXJ5c3RyaW5nLnNwbGl0KFwiJlwiKSkge1xuICAgICAgICAgICAgbGV0IFtrZXksIHZhbHVlID0gbnVsbF0gPSBwYWlyLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgIGtleSA9IGRlY29kZVVSSUNvbXBvbmVudChrZXkpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCEoa2V5IGluIHF1ZXJ5KSkge1xuICAgICAgICAgICAgICAgIHF1ZXJ5W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocXVlcnlba2V5XSkpIHtcbiAgICAgICAgICAgICAgICBxdWVyeVtrZXldLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVlcnlba2V5XSA9IFtxdWVyeVtrZXldLCB2YWx1ZV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHF1ZXJ5O1xufVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/../../node_modules/.pnpm/@smithy+querystring-parser@4.0.2/node_modules/@smithy/querystring-parser/dist-es/index.js\n");

/***/ })

};
;