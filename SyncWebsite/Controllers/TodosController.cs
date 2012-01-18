using System.Web.Mvc;

namespace Web.Controllers
{
    public class TodosController : Controller
    {
        //GET:  /Todos/List
        public ActionResult List()
        {
            var todos = new[]
                        {
                            new { Title = "Todo 1", Priority = "High" },
                            new { Title = "Todo 2", Priority = "Normal" }
                        };

            return Json(todos, JsonRequestBehavior.AllowGet);
        }

        //POST: /Todos/Save
        public ActionResult Save()
        {
            return Json(new { Succeeded = true }, JsonRequestBehavior.AllowGet);
        }
    }
}
