# ZohoCreatorWidgetReactTemplate

# Install babel with dev dependencies
npm install --save-dev @babel/core @babel/cli @babel/preset-env @babel/preset-react @babel/plugin-transform-runtime
 
# Install webpack with dev dependencies 
npm install --save-dev webpack webpack-cli webpack-dev-server style-loader css-loader babel-loader

# Install react
npm install react react-dom

# Install Material-UI
npm install @material-ui/core

# In index.html, reference Google's Roboto Font
# <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />

# In index.html, reference Material UI Icons
# <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />

# Add custom script to package.json
# "zet-pack": "webpack --mode production && zet validate && zet pack"

# Run this script to compile, bundle, and then zet pack
npm run zet-pack

npm install eslint-plugin-react-hooks --save-dev