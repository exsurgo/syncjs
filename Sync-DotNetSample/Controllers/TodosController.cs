 using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Web.Controllers
{
    public class TodosController : Controller
    {
        //GET:  /Todo/List
        public ActionResult List()
        {
            var todos = new[]
                        {
                            new { TodoID = 1, Title = "Todo 1", Priority = "High" },
                            new { TodoID = 2, Title = "Todo 2", Priority = "Normal" },
                            new { TodoID = 3, Title = "Todo 2", Priority = "Low" }
                        };

            return Json(todos, JsonRequestBehavior.AllowGet);
        }

    }
}
