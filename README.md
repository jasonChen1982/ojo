# f

Read our [documentation](http://apblog.uae.ucweb.local/team/%E5%B7%A5%E5%85%B7/%E5%89%8D%E7%AB%AF%E5%B7%A5%E5%85%B7/index.html) for more information.

## Install

```
npm i -g git+ssh://git@git.ucweb.local:pffe/f.git
```

## Usage

```
  Usage: f [options] [command]


  Commands:

    init                                 create a new front-end project
    i18n <lang>                          create a new i18n JSON file
    sync [options]                       sync i18n JSON file
    upload [task]                        upload file to static server
    v|view <name>                        create a new view page
    c|cmp <name>                         create a new component
    i|install [cmp]                      install pffe component(s) from git.ucweb.local
    sm [options] <errFile> <line> <col>  return error in the position of the original code
    w|watch [options]                    build and watch your project with fis3
    r|release [options] [media]          build your project with fis3
    s|start [options]                    start server
    open                                 open server folder

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```
