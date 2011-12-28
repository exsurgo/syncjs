
Sync.routes = [

    //Task controller
    {
        regex: /$Task(s)?\//, 
        scripts: ["/Scripts/Controllers/TaskController.js"]
    },

    //Milestone controller
    {
        regex: /$Milestone(s)?\//, 
        scripts: ["/Scripts/Controllers/MilestoneController.js"]
    }

]