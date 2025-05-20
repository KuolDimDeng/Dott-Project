"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/@smithy+url-parser@4.0.2";
exports.ids = ["vendor-chunks/@smithy+url-parser@4.0.2"];
exports.modules = {

/***/ "(ssr)/../../node_modules/.pnpm/@smithy+url-parser@4.0.2/node_modules/@smithy/url-parser/dist-es/index.js":
/*!**********************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@smithy+url-parser@4.0.2/node_modules/@smithy/url-parser/dist-es/index.js ***!
  \**********************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   parseUrl: () => (/* binding */ parseUrl)\n/* harmony export */ });\n/* harmony import */ var _smithy_querystring_parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @smithy/querystring-parser */ \"(ssr)/../../node_modules/.pnpm/@smithy+querystring-parser@4.0.2/node_modules/@smithy/querystring-parser/dist-es/index.js\");\n\nconst parseUrl = (url) => {\n    if (typeof url === \"string\") {\n        return parseUrl(new URL(url));\n    }\n    const { hostname, pathname, port, protocol, search } = url;\n    let query;\n    if (search) {\n        query = (0,_smithy_querystring_parser__WEBPACK_IMPORTED_MODULE_0__.parseQueryString)(search);\n    }\n    return {\n        hostname,\n        port: port ? parseInt(port) : undefined,\n        protocol,\n        path: pathname,\n        query,\n    };\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0BzbWl0aHkrdXJsLXBhcnNlckA0LjAuMi9ub2RlX21vZHVsZXMvQHNtaXRoeS91cmwtcGFyc2VyL2Rpc3QtZXMvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBOEQ7QUFDdkQ7QUFDUDtBQUNBO0FBQ0E7QUFDQSxZQUFZLDZDQUE2QztBQUN6RDtBQUNBO0FBQ0EsZ0JBQWdCLDRFQUFnQjtBQUNoQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9rdW9sZGVuZy9wcm9qZWN0eC9ub2RlX21vZHVsZXMvLnBucG0vQHNtaXRoeSt1cmwtcGFyc2VyQDQuMC4yL25vZGVfbW9kdWxlcy9Ac21pdGh5L3VybC1wYXJzZXIvZGlzdC1lcy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwYXJzZVF1ZXJ5U3RyaW5nIH0gZnJvbSBcIkBzbWl0aHkvcXVlcnlzdHJpbmctcGFyc2VyXCI7XG5leHBvcnQgY29uc3QgcGFyc2VVcmwgPSAodXJsKSA9PiB7XG4gICAgaWYgKHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlVXJsKG5ldyBVUkwodXJsKSk7XG4gICAgfVxuICAgIGNvbnN0IHsgaG9zdG5hbWUsIHBhdGhuYW1lLCBwb3J0LCBwcm90b2NvbCwgc2VhcmNoIH0gPSB1cmw7XG4gICAgbGV0IHF1ZXJ5O1xuICAgIGlmIChzZWFyY2gpIHtcbiAgICAgICAgcXVlcnkgPSBwYXJzZVF1ZXJ5U3RyaW5nKHNlYXJjaCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGhvc3RuYW1lLFxuICAgICAgICBwb3J0OiBwb3J0ID8gcGFyc2VJbnQocG9ydCkgOiB1bmRlZmluZWQsXG4gICAgICAgIHByb3RvY29sLFxuICAgICAgICBwYXRoOiBwYXRobmFtZSxcbiAgICAgICAgcXVlcnksXG4gICAgfTtcbn07XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/../../node_modules/.pnpm/@smithy+url-parser@4.0.2/node_modules/@smithy/url-parser/dist-es/index.js\n");

/***/ })

};
;