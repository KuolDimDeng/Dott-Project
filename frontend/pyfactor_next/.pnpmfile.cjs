function readPackage(pkg, context) {
    // Fix SWC issues for Windows
    if (pkg.name === '@next/swc-win32-x64-msvc') {
      delete pkg.cpu;
    }
  
    // Fix peer dependency issues
    if (pkg.peerDependencies) {
      Object.keys(pkg.peerDependencies).forEach(dependency => {
        if (dependency === 'react' || dependency === 'react-dom') {
          pkg.peerDependencies[dependency] = '*';
        }
      });
    }
  
    return pkg;
  }
  
  module.exports = {
    hooks: {
      readPackage
    }
  };