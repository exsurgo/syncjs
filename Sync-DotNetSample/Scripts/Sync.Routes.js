
Sync.Routes = [

    //Tasks
    {
        route: /$Tasks\//i,
        load: [ "/Scripts/Controllers/TaskController.js" ]
    },

    //Task list
    {
        route: /$Tasks\//i,
        dataUrl: "/Tasks",
        template: "/Templates/Tasks"
    },

];