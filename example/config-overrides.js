// Create react app doesn't allow one to use code outside the main src/
// directory, which is desireable in our case since we want the example
// to use the parent directory package. So we use `react-app-rewire-alias`
// to work around this limitation. This setup only applies to this example
// and the standard create-react-app configuration should work for most,
// if not all, other cases.

const { aliasDangerous, aliasJest, configPaths } = require('react-app-rewire-alias/lib/aliasDangerous');

const aliasMap = configPaths('./tsconfig.paths.json')
module.exports = aliasDangerous(aliasMap)
module.exports.jest = aliasJest(aliasMap)
