+++
# for all options https://gohugo.io/content-management/front-matter/

# content will not be rendered unless --buildExpired is used 
draft = true
date = {{ .Date }}

title = "{{ replace .Name "-" " " | title }}"
# used by twitter
# description = "Text about my cool site"
# images = ["post-cover.png"]

# these don't show to the reader. However you can use these to cross link related posts. 
# Related posts show up at the bottom of each post. 
tags = []

# This is meant for high level categorization. 
# People can see posts under a list of categories in blog.karthickg.com/categories (also in the footer)
categories = []

# appears as the tail of the output URL
# overrides segment of the URL based on the filename
slug = ""

# daring fireball style external link posts. 
# it’ll show an arrow with link to outside page. 
# also adds permanent link to your own post
externalLinkTo = ""


# old published paths of renamed content
# provide relative urls from base that should redirect here
aliases = []

# Sometimes you want to post your stuff again in your own blog. 
# Either to reach your own readers or just keeping a permanent copy that you control
# Say you posted on medium but want to repost here with embellishment, 
# add the medium link as a canonicalUrl
# this will make sure Google doesn't screw you over on SEO
# canonicalUrl = "
+++


<!---
See https://blog.jkl.gg/henry-jekyll-theme/ for details on how to use Henry
--->