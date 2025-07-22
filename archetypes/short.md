---
draft: true
date: '{{ .Date }}'
type: 'shorts'
slug: '{{ replaceRE "^\\d{4}-\\d{2}-\\d{2}-" "" .File.ContentBaseName }}'
title: '{{ replace (replaceRE "^\\d{4}-\\d{2}-\\d{2}-" "" .File.ContentBaseName) "-" " " | title }}'
# summary: "Mini desc. used in twitter & SEO"
# tags:
#   - tag1
#   - tag2
# externalLink: "https://daring-fireball-style"
# canonicalUrl: "https://when-posted-first-on-medium"
# banner: "/images/content/tw-xxx.png|kau.sh.webp"
# aliases:
#   - "/2010/new-year/"
# bsky:
---
