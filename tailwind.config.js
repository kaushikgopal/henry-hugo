/** @type {import('tailwindcss').Config} */
module.exports = {
    /* Content sources to tell Tailwind which files to scan for used class names for
         generating the needed CSS. More info:
         - https://tailwindcss.com/docs/content-configuration#configuring-source-paths
      */
    content: [
      "./layouts/**/*.html",
      "./content/**/*.{html,md}",
      "./themes/henry/layouts/**/*.html",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        function ({addUtilities}) {
            console.log ('Tailwind CSS root directory:', process.cwd ());
        },
        require ('@tailwindcss/typography'),
    ],
}

