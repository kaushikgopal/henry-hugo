# Henry

<p align="center"><img src="static/images/henry.png"></p>

Henry is a [Hugo](https://gohugo.io/) theme with a gorgeous reading experience, chock-full of features. To find out more about all the features check out this [blog post](https://jkl.gg/b/henry-hugo-theme/).

# Getting Started

The easiest way to get up and running with a Hugo blog using Henry is as follows: 

```shell
# 1. Install Hugo
#    https://gohugo.io/getting-started/installing/
brew install hugo

hugo new site blog-henry
cd blog-henry

# 2. clone Henry
git clone git@github.com:kaushikgopal/henry-hugo.git themes/henry

# 3. configure blog
## inside your config.toml file
theme = "henry"

# 4. add a post (or Hugo won't show anything)
mkdir -p content
cp themes/henry/content/*.md content/

# 5. run hugo server
hugo server -D 

open http://localhost:1313/
```

You're good to go. Happy blogging!

# Contributing

Bug reports and pull requests are welcome on [GitHub](https://github.com/kaushikgopal/henry-hugo). This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.


# Henry in the Wild

Here are a couple of blogs that use Henry:

1. [Karthick Gopal's blog](https://karthickg.com/blog)
2. [Kaushik Gopal's blog](https://jkl.gg/b)

# License

The theme is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

