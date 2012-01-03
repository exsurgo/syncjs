
Sync.Routes = [

    //Task controller
    {
        regex: /$Task(s)?\//i,
        scripts: ["/Scripts/Controllers/TaskController.js"]
    },

    //Milestone controller
    {
        regex: /$Milestone(s)?\//i,
        scripts: ["/Scripts/Controllers/MilestoneController.js"]
    }

];