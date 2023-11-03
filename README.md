# Henry

<p align="center"><img src="images/henry.png"></p>

Henry is a [Hugo](https://gohugo.io/) theme with a gorgeous reading experience, chock-full of features. To find out more about all the features check out this [blog post](https://kau.sh/blog/henry-hugo-theme/).

<p align="center"><img src="images/screenshot.png"></p>

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
## add these lines to your hugo.toml config file
theme = "henry"
[params]
    ExternalLinkIndicator = "»"

[outputs]
    page = ["HTML"]
    home = ["HTML", "RSS", "JSON"]
    section = ["HTML","RSS"]
    taxonomy = ["HTML","RSS"]

[outputFormats]
[outputFormats.RSS]
    mediatype = "application/rss"
    baseName = "feed"

# 4. run Hugo!
hugo server -D
open http://localhost:1313/

# sample posts are in henry's content folder : themes/henry/content
# if you want to see some samples, just mark them from draft true → false
```

You're good to go. Happy blogging!

# Contributing

Bug reports and pull requests are welcome on [GitHub](https://github.com/kaushikgopal/henry-hugo). This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.


# Henry in the Wild

Here are a couple of blogs that use Henry:

1. [Karthick Gopal's blog](https://karthickg.com/blog)
2. [Kaushik Gopal's blog](https://kau.sh/blog)

# License

The theme is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

