/** @type {import('tailwindcss').Config} */
module.exports = {
    /* Content sources to tell Tailwind which files to scan for used class names for
         generating the needed CSS. More info:
         - https://tailwindcss.com/docs/content-configuration#configuring-source-paths
      */
    content: [
        "../../content/**/*.{html,md}",
        "../../layouts/**/*.html",
        "./layouts/**/*.html",
    ],
    theme: {
        fontFamily: {
            'sans': ['kg-sans'],
            'serif': ['kg-serif'],
            'mono': ['SF Mono', 'ui-monospace', 'kg-mono'],
        },
        extend: {
            colors: {
                "henry-0": "#1c2b33",
                "henry-1": "#152027",
            },
        },
    },
    plugins: [
        function ({addUtilities}) {
            console.log ('Tailwind CSS root directory:', process.cwd ());
        },
    ],
}

