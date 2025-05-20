"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/@smithy+querystring-builder@4.0.2";
exports.ids = ["vendor-chunks/@smithy+querystring-builder@4.0.2"];
exports.modules = {

/***/ "(ssr)/../../node_modules/.pnpm/@smithy+querystring-builder@4.0.2/node_modules/@smithy/querystring-builder/dist-es/index.js":
/*!****************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@smithy+querystring-builder@4.0.2/node_modules/@smithy/querystring-builder/dist-es/index.js ***!
  \****************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   buildQueryString: () => (/* binding */ buildQueryString)\n/* harmony export */ });\n/* harmony import */ var _smithy_util_uri_escape__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @smithy/util-uri-escape */ \"(ssr)/../../node_modules/.pnpm/@smithy+util-uri-escape@4.0.0/node_modules/@smithy/util-uri-escape/dist-es/index.js\");\n\nfunction buildQueryString(query) {\n    const parts = [];\n    for (let key of Object.keys(query).sort()) {\n        const value = query[key];\n        key = (0,_smithy_util_uri_escape__WEBPACK_IMPORTED_MODULE_0__.escapeUri)(key);\n        if (Array.isArray(value)) {\n            for (let i = 0, iLen = value.length; i < iLen; i++) {\n                parts.push(`${key}=${(0,_smithy_util_uri_escape__WEBPACK_IMPORTED_MODULE_0__.escapeUri)(value[i])}`);\n            }\n        }\n        else {\n            let qsEntry = key;\n            if (value || typeof value === \"string\") {\n                qsEntry += `=${(0,_smithy_util_uri_escape__WEBPACK_IMPORTED_MODULE_0__.escapeUri)(value)}`;\n            }\n            parts.push(qsEntry);\n        }\n    }\n    return parts.join(\"&\");\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0BzbWl0aHkrcXVlcnlzdHJpbmctYnVpbGRlckA0LjAuMi9ub2RlX21vZHVsZXMvQHNtaXRoeS9xdWVyeXN0cmluZy1idWlsZGVyL2Rpc3QtZXMvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBb0Q7QUFDN0M7QUFDUDtBQUNBO0FBQ0E7QUFDQSxjQUFjLGtFQUFTO0FBQ3ZCO0FBQ0EsaURBQWlELFVBQVU7QUFDM0QsOEJBQThCLElBQUksR0FBRyxrRUFBUyxXQUFXO0FBQ3pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0Isa0VBQVMsUUFBUTtBQUNoRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9rdW9sZGVuZy9wcm9qZWN0eC9ub2RlX21vZHVsZXMvLnBucG0vQHNtaXRoeStxdWVyeXN0cmluZy1idWlsZGVyQDQuMC4yL25vZGVfbW9kdWxlcy9Ac21pdGh5L3F1ZXJ5c3RyaW5nLWJ1aWxkZXIvZGlzdC1lcy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlc2NhcGVVcmkgfSBmcm9tIFwiQHNtaXRoeS91dGlsLXVyaS1lc2NhcGVcIjtcbmV4cG9ydCBmdW5jdGlvbiBidWlsZFF1ZXJ5U3RyaW5nKHF1ZXJ5KSB7XG4gICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMocXVlcnkpLnNvcnQoKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHF1ZXJ5W2tleV07XG4gICAgICAgIGtleSA9IGVzY2FwZVVyaShrZXkpO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBpTGVuID0gdmFsdWUubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFydHMucHVzaChgJHtrZXl9PSR7ZXNjYXBlVXJpKHZhbHVlW2ldKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCBxc0VudHJ5ID0ga2V5O1xuICAgICAgICAgICAgaWYgKHZhbHVlIHx8IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIHFzRW50cnkgKz0gYD0ke2VzY2FwZVVyaSh2YWx1ZSl9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcnRzLnB1c2gocXNFbnRyeSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oXCImXCIpO1xufVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/../../node_modules/.pnpm/@smithy+querystring-builder@4.0.2/node_modules/@smithy/querystring-builder/dist-es/index.js\n");

/***/ })

};
;