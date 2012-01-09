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
                            new { Title = "Todo 1", Priority = "High" },
                            new { Title = "Todo 2", Priority = "Normal" }
                        };

            return Json(todos, JsonRequestBehavior.AllowGet);
        }

    }
}
