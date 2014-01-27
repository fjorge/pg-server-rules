# Phune Gaming server-side rules

## SPI documentation

For the SPI documentation please read [Phune Gaming server-side game development documentation](http://phune-gaming.github.io/pg-server-rules/).

## Generate the site locally

To build the site locally please read the following subsections.

### Requirements

This documentation is built with [Jekyll](http://jekyllrb.com/). It you don't have Jekyll installed please read the [Jekyll Installation](http://jekyllrb.com/docs/installation/) page to install it.

### Build

In order to build the documentation site run:

```
$ jekyll build --watch
# => The current folder will be generated into ./_site,
#    watched for changes, and regenerated automatically.
```

### Preview

Jekyll also comes with a built-in development server that will allow you to preview what the generated site will look like in your browser locally:

```
$ jekyll serve --watch --baseurl ''
# => A development server will run at http://localhost:4000/,
#    watched for changes, and regenerated automatically.
```

## License

Copyright (c) 2014 Present Technologies

Licensed under the MIT license.
