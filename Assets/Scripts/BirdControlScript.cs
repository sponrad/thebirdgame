using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class BirdControlScript : MonoBehaviour {

	public float speed = 4.0f;
	public float rotationSpeed = 1.0f;

	public static List<BirdControlScript> BirdList = new List<BirdControlScript>();

	private GameObject player;

	// Use this for initialization
	void Start () {
		player = GameObject.Find ("plane");
		BirdList.Add (this);
	}

	// Update is called once per frame
	void Update () {
		
		Vector3 vectorToTarget = player.transform.position - transform.position;
		float angle = Mathf.Atan2(vectorToTarget.y, vectorToTarget.x) * Mathf.Rad2Deg - 90;
		Quaternion q = Quaternion.AngleAxis(angle, Vector3.forward);
		transform.rotation = Quaternion.Slerp(transform.rotation, q, Time.deltaTime * rotationSpeed);

		//get a factor for all of the nearby enemies to apply to the position
		Vector3 v2 = rule2(this);

		transform.position += (transform.up + v2) * speed * Time.deltaTime;
	}

	void OnDestroy(){
		BirdList.Remove (this);
	}
		
	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			Debug.Log ("plane collision");
			//game over
		}
	}

	private Vector3 rule2(BirdControlScript ej)
	{
		Vector3 center = Vector3.zero;

		for(int j = 0; j < BirdList.Count; j++)
		{
			BirdControlScript e = BirdList[j];

			float enemyDistance = Vector3.Distance (ej.transform.position, e.transform.position);

			if(e != ej && enemyDistance <= 2f)
			{
				center = center - (e.transform.position - ej.transform.position);
			}
		}

		return center;
	}
}
