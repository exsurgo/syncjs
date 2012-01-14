
//Initialize the view
Sync.initView(function() {

    //Code syntax highlighting
    SyntaxHighlighter.defaults["toolbar"] = false;
    SyntaxHighlighter.highlight(document.body);
    
    //Syntax fixes
    $("code:contains(scriptt)").text("script");
    $("code:contains(bodyy)").text("body");
    $("code:contains(headd)").text("head");
    $("code:contains(htmll)").text("html");

});
