# Markdown Showcase: A Living Demo

Welcome to your portable demo article. It exercises the bits your site renders well: headings, emphasis, links, lists, code blocks, and your special wiki-style links and tags.

**TL;DR**: Use this as a template when writing future posts. See [[Articles]] for more entries. #demo #markdown #guide

## 1) Headings

Headings 1–3 are most common:

# H1 title (page title you just saw)
## H2 section
### H3 subsection

## 2) Emphasis and inline code

You can make text **bold**, *italic*, or **_both_**.  
Inline code looks like `const x = 42;`.

Links look like this: [Visit GitHub](https://github.com/).  
Internal cross-link: see [[Resume]] or [[Notes]].

## 3) Unordered lists

- Simple bullet
- Bullets can include *emphasis* and `code`
- Nested list:
  - Child item
  - Another child

## 4) Ordered lists

1. First
2. Second
3. Third

## 5) Tasks (render as regular list items)

- [ ] Draft outline
- [x] Add code examples
- [ ] Publish

## 6) Code fences

### JavaScript

```js
// A tiny slug function (same idea as your app)
function slug(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}


console.log(slug("Hello, Markdown World!")); // hello-markdown-world
```


### Images
![Wedding Photo](images/0340_ValMark.jpg "My beautiful bride, 2024")