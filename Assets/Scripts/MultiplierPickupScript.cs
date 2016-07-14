using UnityEngine;
using System.Collections;

public class MultiplierPickupScript : MonoBehaviour {

	// Use this for initialization
	void Start () {
	
	}

	// Update is called once per frame
	void Update () {
	}

	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			Debug.Log ("TRIGGER PLANE");
			transform.parent.GetComponent<MultiplierControlScript>().target = coll.gameObject.transform;
		}
	}
}
