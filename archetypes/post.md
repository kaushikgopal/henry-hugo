+++
# for all options https://gohugo.io/content-management/front-matter/

# content will not be rendered unless --buildExpired is used
draft = true

date = {{ .Date.Format "2006-01-02" }}

# Blog post title
title = "{{ replace .Name "-" " " | title }}"

# appears as the tail of the output URL
# if you want to control what your URL looks like, change it here
# automatically converted to lower-case-hyphenated
# slug = ""

# These don't show up directly to the reader.
# But this is what we use to cross-link posts and show "Related Posts".
# Related posts show up at the bottom of each post.
tags = []

# This is meant for high level categorization.
# People can see posts under a list of categories in {site.BaseURL}/categories/ page.
# The link shows up in the footer.
categories = []

# daring fireball style external link posts.
# it’ll show an arrow with link to outside page.
# also adds permanent link to your own post
# externalLinkTo = ""

# If you changed the URL of a page or post, and want that location to link here
# Provide relative urls from base that should redirect here
# you can consolidate them here
# aliases = []

# Sometimes you want to post your content on medium, or another place (for social traction).
# You might additionally want to post it here (making sure content lives in your control)
# or just boost the visibility of the content again from your own blog, embellishing with some notes.

# Add the medium (or external site) link here as a canonicalUrl.
# This will make sure Google doesn't screw you over on SEO and you're attributing source correctly.
# canonicalUrl = "

# banner image
# This image is picked up automatically (for twitter/og tags) + RSS feeds
# banner = images/content/soul.jpg | ./henry.webp
+++

<!---
See https://kau.sh/blog/henry-jekyll-theme/ for details on how to use Henry
--->
