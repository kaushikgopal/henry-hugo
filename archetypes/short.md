---
# for all options https://gohugo.io/content-management/front-matter/

# content will not be rendered unless --buildExpired is used
draft: true

date: {{ .Date.Format "2006-01-02" }}

# Blog post title
title: "{{ replace .Name "-" " " | title }}"

# appears as the tail of the output URL
# if you want to control what your URL looks like, change it here
# automatically converted to lower-case-hyphenated
# slug: ""
slug: custom-url-if-needed

# These don't show up directly to the reader.
# But this is what we use to cross-link posts and show "Related Posts".
# Related posts show up at the bottom of each post.
tags: []

# This is meant for high level categorization.
# People can see posts under a list of categories in {site.BaseURL}/categories/ page.
# The link shows up in the footer.
categories: []

layout:

# if you want comments enabled via bluesky
bsky:
---

<!---
See https://kau.sh/blog/henry-jekyll-theme/ for details on how to use Henry
--->
